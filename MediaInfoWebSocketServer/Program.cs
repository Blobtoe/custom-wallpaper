using System.Text.Json;
using Windows.Media.Control;
using Windows.Storage.Streams;
using WebSocketSharp.Server;


namespace MediaInfoWebsocketServer
{
    class Program
    {
        const string SERVER_ADDRESS = "ws://localhost:8000";

        static WebSocketServer server = new WebSocketServer(SERVER_ADDRESS);
        static GlobalSystemMediaTransportControlsSessionManager? sessionManager;
        public static GlobalSystemMediaTransportControlsSession? session;

        static async Task Main()
        {
            AppDomain.CurrentDomain.ProcessExit += new EventHandler (OnProcessExit);

            // init session manager
            sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();

            // set event handlers
            sessionManager.CurrentSessionChanged += HandleSessionChange;

            // get current session
            session = sessionManager.GetCurrentSession();

            if (session != null)
            {
                SetSessionEventHandlers();
            }

            server.AddWebSocketService<WebSocketController>("/mediainfo");
            server.Start();

            // wait
            Console.ReadKey();
        }

        static void OnProcessExit(object sender, EventArgs e)
        {
            server.Stop();
        }

        static void SetSessionEventHandlers()
        {
            session.PlaybackInfoChanged += HandlePlaybackStateChange;
            session.MediaPropertiesChanged += HandleMediaInfoChange;
            session.TimelinePropertiesChanged += HandleTimelineChange;
        }

        static async void HandlePlaybackStateChange(GlobalSystemMediaTransportControlsSession sender, PlaybackInfoChangedEventArgs e)
        {
            server.WebSocketServices["/mediainfo"].Sessions.Broadcast(JsonSerializer.Serialize(await GetMediaPlaybackState()));
        }

        static async void HandleMediaInfoChange(GlobalSystemMediaTransportControlsSession sender, MediaPropertiesChangedEventArgs e)
        {
            server.WebSocketServices["/mediainfo"].Sessions.Broadcast(JsonSerializer.Serialize(await GetMediaInfo()));
        }
        
        static async void HandleTimelineChange(GlobalSystemMediaTransportControlsSession sender, TimelinePropertiesChangedEventArgs e)
        {
            server.WebSocketServices["/mediainfo"].Sessions.Broadcast(JsonSerializer.Serialize(await GetMediaPosition()));
        }
        
        static async void HandleSessionChange(GlobalSystemMediaTransportControlsSessionManager sender, CurrentSessionChangedEventArgs e)
        {
            session = sessionManager.GetCurrentSession();
            if (session != null)
            {
                SetSessionEventHandlers();
                server.WebSocketServices["/mediainfo"].Sessions.Broadcast(JsonSerializer.Serialize(await GetMediaInfo()));
                server.WebSocketServices["/mediainfo"].Sessions.Broadcast(JsonSerializer.Serialize(await GetMediaPosition()));
                server.WebSocketServices["/mediainfo"].Sessions.Broadcast(JsonSerializer.Serialize(await GetMediaPlaybackState()));
            }
        }

        public async static Task<MediaInfo> GetMediaInfo()
        {
            if (session == null)
            {
                return null;
            }
            GlobalSystemMediaTransportControlsSessionTimelineProperties timelineProperties = session.GetTimelineProperties();
            GlobalSystemMediaTransportControlsSessionMediaProperties mediaProperties = await session.TryGetMediaPropertiesAsync();
            byte[] ByteArray = null;
            if (mediaProperties.Thumbnail != null)
            {
                IRandomAccessStreamWithContentType ThumbnailStream = await mediaProperties.Thumbnail.OpenReadAsync();
                Windows.Storage.Streams.Buffer ThumbnailBuffer = new Windows.Storage.Streams.Buffer((uint)ThumbnailStream.Size);
                await ThumbnailStream.ReadAsync(ThumbnailBuffer, ThumbnailBuffer.Capacity, InputStreamOptions.ReadAhead);
                DataReader BufferReader = DataReader.FromBuffer(ThumbnailBuffer);
                ByteArray = new byte[ThumbnailBuffer.Capacity];
                BufferReader.ReadBytes(ByteArray);

                ThumbnailStream.Dispose();
            }
            return new MediaInfo
            {
                Title = mediaProperties.Title,
                Artist = mediaProperties.Artist,
                Album = mediaProperties.AlbumTitle,
                Thumbnail = ByteArray == null ? null : Convert.ToBase64String(ByteArray),
                SongLength = timelineProperties.MaxSeekTime.TotalSeconds
            };
        }

        public async static Task<MediaInfo> GetMediaPosition()
        {
            if (session == null)
            {
                return null;
            }
            GlobalSystemMediaTransportControlsSessionTimelineProperties timelineProperties = session.GetTimelineProperties();
            return new MediaInfo {
                Progress = timelineProperties.Position.TotalSeconds
            };
        }

        public async static Task<MediaInfo> GetMediaPlaybackState()
        {
            if (session == null)
            {
                return null;
            }
            GlobalSystemMediaTransportControlsSessionPlaybackInfo playbackInfo = session.GetPlaybackInfo();
            return new MediaInfo {
                Paused = playbackInfo.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused ? false : true,
                Playing = playbackInfo.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing ? true : false,
            };
        }
    }
}
using WebSocketSharp.Server;
using System.Text.Json;

namespace MediaInfoWebsocketServer
{
    public class WebSocketController : WebSocketBehavior
    {
        protected async override void OnOpen()
        {
            base.OnOpen();
            Console.WriteLine("Client Connected");
            if (Program.session != null)
            {
                Send(JsonSerializer.Serialize(await Program.GetMediaInfo()));
                Send(JsonSerializer.Serialize(await Program.GetMediaPosition()));
                Send(JsonSerializer.Serialize(await Program.GetMediaPlaybackState()));
            }
        }
    }
}

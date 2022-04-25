namespace MediaInfoWebsocketServer;

public class MediaInfo
{
    public string? Title { get; set; }
    public string? Artist { get; set; }
    public string? Album { get; set; }
    public string? Thumbnail { get; set; }
    public double? SongLength { get; set; }
    public double? Progress { get; set; }
    public bool? Paused { get; set; }
    public bool? Playing { get; set; }
}
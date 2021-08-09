from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as MediaManager
from winrt.windows.storage.streams import DataReader, Buffer, InputStreamOptions
import asyncio
from flask import Flask, jsonify
from flask_cors import CORS, cross_origin
import base64
import json

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

async def get_media_info():

    session = (await MediaManager.request_async()).get_current_session()
    if session:
        raw_info = await session.try_get_media_properties_async()
        info = {song_attr: raw_info.__getattribute__(song_attr) for song_attr in dir(raw_info) if song_attr[0] != '_'}
        info['genres'] = list(info['genres'])

        thumb_stream_ref = info['thumbnail']
        thumb_read_buffer = Buffer(5000000)

        # copies data from data stream reference into buffer created above
        readable_stream = await thumb_stream_ref.open_read_async()
        await readable_stream.read_async(thumb_read_buffer, thumb_read_buffer.capacity, InputStreamOptions.READ_AHEAD)

        # reads data (as bytes) from buffer
        buffer_reader = DataReader.from_buffer(thumb_read_buffer)
        byte_buffer = buffer_reader.read_bytes(thumb_read_buffer.length)

        info['thumbnail'] = str(base64.b64encode(bytearray(byte_buffer)))[2:-1]

        return info
    else:
        return None

@app.route("/media_info", methods=["GET"])
@cross_origin(origin='localhost', headers=['Content- Type','Authorization'])
def media_info():
    return jsonify(asyncio.run(get_media_info())), 200

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
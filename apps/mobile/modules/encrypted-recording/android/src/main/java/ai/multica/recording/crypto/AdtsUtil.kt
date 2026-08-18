package ai.multica.recording.crypto

object AdtsUtil {
  /**
   * Return the byte offset of the last complete ADTS frame start.
   * If none found, returns 0. The exclusive end of that frame is
   * start + frameLength when the frame is fully inside [data].
   */
  fun findLastCompleteAdtsFrame(data: ByteArray): Int {
    var lastFrameStart = -1
    var offset = 0
    while (offset < data.size - 6) {
      if (data[offset] == 0xFF.toByte() && (data[offset + 1].toInt() and 0xF0) == 0xF0) {
        val frameLength =
          ((data[offset + 3].toInt() and 0x03) shl 11) or
            ((data[offset + 4].toInt() and 0xFF) shl 3) or
            ((data[offset + 5].toInt() and 0xE0) shr 5)
        if (frameLength < 7 || offset + frameLength > data.size) break
        lastFrameStart = offset
        offset += frameLength
      } else {
        offset++
      }
    }
    return if (lastFrameStart >= 0) lastFrameStart else 0
  }

  fun endOfLastCompleteFrame(data: ByteArray): Int {
    val start = findLastCompleteAdtsFrame(data)
    if (start < 0 || start + 6 >= data.size) return 0
    val frameLength =
      ((data[start + 3].toInt() and 0x03) shl 11) or
        ((data[start + 4].toInt() and 0xFF) shl 3) or
        ((data[start + 5].toInt() and 0xE0) shr 5)
    val end = start + frameLength
    return if (end in 7..data.size) end else 0
  }

  data class Frame(val offset: Int, val length: Int, val payloadOffset: Int, val payloadLength: Int)

  fun iterateFrames(data: ByteArray): List<Frame> {
    val frames = mutableListOf<Frame>()
    var offset = 0
    while (offset < data.size - 6) {
      if (data[offset] == 0xFF.toByte() && (data[offset + 1].toInt() and 0xF0) == 0xF0) {
        val frameLength =
          ((data[offset + 3].toInt() and 0x03) shl 11) or
            ((data[offset + 4].toInt() and 0xFF) shl 3) or
            ((data[offset + 5].toInt() and 0xE0) shr 5)
        if (frameLength < 7 || offset + frameLength > data.size) break
        frames.add(Frame(offset, frameLength, offset + 7, frameLength - 7))
        offset += frameLength
      } else {
        offset++
      }
    }
    return frames
  }
}

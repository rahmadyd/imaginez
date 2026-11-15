export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;

  for (const track of stream.getTracks()) {
    track.stop();
  }
}

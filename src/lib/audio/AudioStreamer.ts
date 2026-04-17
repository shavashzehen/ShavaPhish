const PCM_CHUNK_SIZE = 2048;

export class AudioStreamer {
  private readonly inputContext: AudioContext;
  private readonly outputContext: AudioContext;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private nextPlaybackTime = 0;

  constructor() {
    this.inputContext = new AudioContext({ sampleRate: 16000 });
    this.outputContext = new AudioContext({ sampleRate: 24000 });
  }

  async startInput(onChunk: (base64Pcm16: string) => void): Promise<void> {
    if (this.mediaStream) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });

    this.sourceNode = this.inputContext.createMediaStreamSource(this.mediaStream);
    this.processorNode = this.inputContext.createScriptProcessor(PCM_CHUNK_SIZE, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm = this.float32ToInt16(input);
      onChunk(this.arrayBufferToBase64(pcm.buffer));
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.inputContext.destination);
  }

  stopInput(): void {
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.processorNode = null;
    this.sourceNode = null;

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
  }

  playOutput(base64Pcm16: string): void {
    const pcm16 = this.base64ToInt16Array(base64Pcm16);
    if (!pcm16.length) return;

    const floatData = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i += 1) {
      floatData[i] = pcm16[i] / 32768;
    }

    const buffer = this.outputContext.createBuffer(1, floatData.length, 24000);
    buffer.copyToChannel(floatData, 0);

    const source = this.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputContext.destination);

    const now = this.outputContext.currentTime;
    this.nextPlaybackTime = Math.max(this.nextPlaybackTime, now);
    source.start(this.nextPlaybackTime);
    this.nextPlaybackTime += buffer.duration;
  }

  interruptOutput(): void {
    this.nextPlaybackTime = this.outputContext.currentTime;
  }

  async resumeContexts(): Promise<void> {
    if (this.inputContext.state === 'suspended') await this.inputContext.resume();
    if (this.outputContext.state === 'suspended') await this.outputContext.resume();
  }

  close(): void {
    this.stopInput();
    void this.inputContext.close();
    void this.outputContext.close();
  }

  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const output = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output;
  }

  private base64ToInt16Array(base64: string): Int16Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  private arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

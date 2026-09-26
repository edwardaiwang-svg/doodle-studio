// Frames and soundtrack → MP4 with WebCodecs, muxed by Mediabunny: H.264 video and AAC audio, which Google Drive plays
// everywhere. ChromeOS and Linux have no WebCodecs AAC encoder, so there Mediabunny's WASM build of FFmpeg's AAC
// encoder stands in; Opus is the last resort.
import { AudioSample, AudioSampleSource, BufferTarget, Mp4OutputFormat, Output, Quality, VideoSample, VideoSampleSource,
  canEncodeAudio, canEncodeVideo } from '../vendor/mediabunny/mediabunny.min.mjs';

const AUDIO_BITRATE = 192_000;                // the desktop app's AAC bitrate
const AUDIO_CHUNK = 48_000;                   // frames per AudioSample: the soundtrack goes in one second at a time
// avc1.PPCCLL: [profile_idc, constraint flags] for High, Main and Constrained Baseline, best first
const AVC_PROFILES = [[0x64, 0x00], [0x4d, 0x00], [0x42, 0xe0]];
// H.264 levels (Table A-1): [level_idc, max macroblocks per frame, max macroblocks per second]
const AVC_LEVELS = [[30, 1620, 40500], [31, 3600, 108000], [32, 5120, 216000], [40, 8192, 245760], [42, 8704, 522240],
  [50, 22080, 589824], [51, 36864, 983040], [52, 36864, 2073600]];

/** onProgress({ frames, seconds }) after each frame the encoder has taken. */
export async function createEncoder({ width = 1920, height = 1080, fps = 30, videoBitrate = 3_000_000, sampleRate = 48000,
  onProgress } = {}) {
  const videoQuality = new Quality({ bitrate: videoBitrate });
  const audioQuality = new Quality({ bitrate: AUDIO_BITRATE });
  const codecs = { video: await videoCodec(width, height, fps, videoQuality), audio: await audioCodec(sampleRate, audioQuality) };
  // The index (moov) goes first, so Drive can start playing before the whole file has loaded.
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const video = new VideoSampleSource({ codec: 'avc', quality: videoQuality, fullCodecString: codecs.video });
  const audio = new AudioSampleSource({ codec: codecs.audio, quality: audioQuality });
  output.addVideoTrack(video, { frameRate: fps });
  output.addAudioTrack(audio);
  await output.start();
  let frames = 0;
  return {
    codecs,
    async addFrame(canvas) {
      const sample = new VideoSample(canvas, { timestamp: frames / fps, duration: 1 / fps });
      try {
        await video.add(sample);                                       // waits while the encoder queue is full
      } finally {
        sample.close();
      }
      frames += 1;
      onProgress?.({ frames, seconds: frames / fps });
    },
    async addAudio(left, right) {
      for (let at = 0; at < left.length; at += AUDIO_CHUNK) {
        const n = Math.min(AUDIO_CHUNK, left.length - at);
        const data = new Float32Array(2 * n);
        data.set(left.subarray(at, at + n));
        data.set(right.subarray(at, at + n), n);
        const sample = new AudioSample({ data, format: 'f32-planar', numberOfChannels: 2, sampleRate, timestamp: at / sampleRate });
        try {
          await audio.add(sample);
        } finally {
          sample.close();
        }
      }
    },
    async finish() {
      await output.finalize();
      return new Blob([output.target.buffer], { type: 'video/mp4' });
    },
  };
}

// The best H.264 profile this computer encodes at this size, at the lowest level that fits it.
async function videoCodec(width, height, fps, quality) {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  const [level] = AVC_LEVELS.find(([, frame, rate]) => macroblocks <= frame && macroblocks * fps <= rate) ?? AVC_LEVELS.at(-1);
  const hex = (n) => n.toString(16).padStart(2, '0');
  for (const [profile, flags] of AVC_PROFILES) {
    const codec = `avc1.${hex(profile)}${hex(flags)}${hex(level)}`;
    if (await canEncodeVideo('avc', { width, height, frameRate: fps, quality, fullCodecString: codec })) return codec;
  }
  throw new Error(`This computer cannot make H.264 video at ${width}×${height}.`);
}

async function audioCodec(sampleRate, quality) {
  const options = { numberOfChannels: 2, sampleRate, quality };
  if (await canEncodeAudio('aac', options)) return 'aac';            // Windows, macOS, Android
  try {
    const { registerAacEncoder } = await import('../vendor/mediabunny/mediabunny-aac-encoder.mjs');
    registerAacEncoder();
    return 'aac';
  } catch (err) {
    console.warn('The WASM AAC encoder did not load; trying Opus.', err);
  }
  if (await canEncodeAudio('opus', options)) return 'opus';
  throw new Error(`This computer cannot encode the video's sound.`);
}

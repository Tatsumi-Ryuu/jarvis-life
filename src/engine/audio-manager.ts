import { Howl } from 'howler';
import { BGM_TRACKS, SFX_TRACKS, type BgmKey, type SfxKey } from '../data/audio-manifest';

const FADE_MS = 600;

class AudioManager {
  private bgmHowls = new Map<BgmKey, Howl>();
  private sfxHowls = new Map<SfxKey, Howl>();
  private currentBgm: { key: BgmKey; howl: Howl; soundId: number } | null = null;

  private _musicVolume = 0.7;
  private _sfxVolume = 0.85;
  private _muted = false;

  constructor() {
    for (const [key, src] of Object.entries(BGM_TRACKS)) {
      const howl = new Howl({ src, volume: this._musicVolume, preload: true });
      howl.on('end', () => {
        if (this.currentBgm?.key === key) {
          howl.play();
        }
      });
      this.bgmHowls.set(key as BgmKey, howl);
    }
    for (const [key, src] of Object.entries(SFX_TRACKS)) {
      this.sfxHowls.set(key as SfxKey, new Howl({ src, volume: this._sfxVolume, loop: false, preload: true }));
    }
  }

  // ---- BGM ----

  playBgm(key: BgmKey) {
    if (this._muted) return;
    const howl = this.bgmHowls.get(key);
    if (!howl) return;

    if (this.currentBgm?.key === key && howl.playing(this.currentBgm.soundId)) return;

    // 停止当前 BGM（淡出）
    if (this.currentBgm) {
      const prev = this.currentBgm.howl;
      prev.fade(prev.volume() as number, 0, FADE_MS);
      setTimeout(() => prev.stop(), FADE_MS + 50);
    }

    const soundId = howl.play();
    this.currentBgm = { key, howl, soundId };
  }

  stopBgm() {
    if (!this.currentBgm) return;
    const prev = this.currentBgm.howl;
    prev.fade(prev.volume() as number, 0, FADE_MS);
    setTimeout(() => prev.stop(), FADE_MS + 50);
    this.currentBgm = null;
  }

  // ---- SFX ----

  playSfx(key: SfxKey) {
    if (this._muted) return;
    const howl = this.sfxHowls.get(key);
    if (!howl) return;
    howl.play();
  }

  // ---- 音量控制 ----

  setMusicVolume(v: number) {
    this._musicVolume = v / 100;
    if (this.currentBgm) {
      this.currentBgm.howl.volume(this._musicVolume);
    }
  }

  setSfxVolume(v: number) {
    this._sfxVolume = v / 100;
    for (const howl of this.sfxHowls.values()) {
      howl.volume(this._sfxVolume);
    }
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (muted) {
      this.stopBgm();
    }
  }
}

/** 全局单例 */
export const audioManager = new AudioManager();

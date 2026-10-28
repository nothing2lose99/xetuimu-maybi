type SoundName = 'uiClick' | 'packTear' | 'revealBuildUp' | 'backgroundMusic';

const SOUND_FILES: Record<SoundName, string> = {
  uiClick: '02_ui_click.mp3',
  packTear: '04_pack_tear.mp3',
  revealBuildUp: '05_reveal_build_up.mp3',
  backgroundMusic: 'MAYBI_Doll_Dress_Up_BGM_v2.mp3',
};

const audioElements: Partial<Record<SoundName, HTMLAudioElement>> = {};
let waitingForMusicGesture = false;

function getAudio(sound: SoundName) {
  let audio = audioElements[sound];
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}sound/${SOUND_FILES[sound]}`);
    audio.preload = sound === 'backgroundMusic' ? 'auto' : 'none';
    audio.volume = sound === 'backgroundMusic' ? .32 : .8;
    if (sound === 'backgroundMusic') audio.loop = true;
    audioElements[sound] = audio;
  }
  return audio;
}

export function playSoundEffect(sound: Exclude<SoundName, 'backgroundMusic'>) {
  const audio = getAudio(sound);
  audio.pause();
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // Audio is optional; continue if the browser blocks playback.
  });
}

export function startBackgroundMusic() {
  const audio = getAudio('backgroundMusic');
  if (!audio.paused || waitingForMusicGesture) return;
  void audio.play().catch(() => {
    if (waitingForMusicGesture) return;
    waitingForMusicGesture = true;
    const resumeAfterGesture = () => {
      waitingForMusicGesture = false;
      window.removeEventListener('pointerdown', resumeAfterGesture, true);
      window.removeEventListener('keydown', resumeAfterGesture, true);
      window.removeEventListener('click', resumeAfterGesture, true);
      void audio.play().catch(() => {
        // Audio is optional; continue if the browser blocks playback.
      });
    };
    window.addEventListener('pointerdown', resumeAfterGesture, true);
    window.addEventListener('keydown', resumeAfterGesture, true);
    window.addEventListener('click', resumeAfterGesture, true);
  });
}

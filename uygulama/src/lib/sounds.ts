import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

// Kayıt sesi: gelirde iki notalı "çın-çın", giderde yumuşak "tık". Sesler kendi ürettiğimiz kısa WAV'lar
// (telifsiz). Telefon sessiz moddaysa çalmaz; müziği/navigasyonu kesmez, üstüne karışır.
//
// Güvenilirlik: çalınan ses dosyanın sonunda kalır; başa sarma (seekTo) zaman alır. Sarma BİTMEDEN
// play() çağrılırsa ses bazen hiç çıkmıyordu. Artık sarmayı bekleyip çalıyoruz. Art arda hızlı kayıtta
// sesler birbirini kesmesin diye her ses için küçük bir oynatıcı havuzu var; havuz bir kez kurulup saklanır
// (ekran her açıldığında yeniden yüklenmez, ilk ses de gecikmez).

const POOL_SIZE = 3;
const VOLUME = 0.8;

type Pool = { players: AudioPlayer[]; next: number };
let pools: { income: Pool; expense: Pool } | null = null;

function getPools() {
  if (pools) return pools;
  const make = (src: number): Pool => ({
    players: Array.from({ length: POOL_SIZE }, () => {
      const p = createAudioPlayer(src);
      p.volume = VOLUME;
      return p;
    }),
    next: 0,
  });
  pools = {
    income: make(require('../../assets/sounds/gelir.wav')),
    expense: make(require('../../assets/sounds/gider.wav')),
  };
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  return pools;
}

async function playFrom(pool: Pool) {
  // Sıradaki oynatıcı; hepsi çalıyorsa en eskisini yeniden kullan.
  const idle = pool.players.findIndex((p) => !p.playing);
  const i = idle >= 0 ? idle : pool.next;
  pool.next = (i + 1) % pool.players.length;
  const p = pool.players[i];
  try {
    if (p.playing) p.pause();
    await p.seekTo(0);
    p.play();
  } catch {
    // Ses çalınamazsa kayıt yine de yapılmıştır; sessizce geç.
  }
}

export function useSaveSound(enabled: boolean) {
  // Kayıt ekranı açılır açılmaz oynatıcıları hazırla (ilk kayıtta yüklenme gecikmesi olmasın).
  useEffect(() => {
    if (enabled) getPools();
  }, [enabled]);

  return useCallback(
    (isIncome: boolean) => {
      if (!enabled) return;
      const { income, expense } = getPools();
      playFrom(isIncome ? income : expense);
    },
    [enabled],
  );
}

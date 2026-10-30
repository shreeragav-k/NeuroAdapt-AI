"""Soft synthesised tones. Silent when sound is off or no audio device exists.

No surprise audio: nothing plays unless a player action or a clearly visible
cue happens, volume is capped, and every sound has a gentle attack.
"""
from __future__ import annotations

import numpy as np
import pygame

PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]   # C major pentatonic


class Sounds:
    def __init__(self, enabled: bool = True, volume: float = 0.5):
        self.enabled = enabled
        self.volume = max(0.0, min(1.0, volume)) * 0.6
        self.ok = False
        self._cache: dict = {}
        if not enabled:
            return
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=22050, size=-16, channels=1, buffer=512)
            self.ok = True
        except pygame.error:
            self.ok = False

    def _tone(self, freq: float, dur: float = 0.6, decay: float = 5.0):
        key = (round(freq, 1), dur, decay)
        snd = self._cache.get(key)
        if snd is None:
            sr = 22050
            t = np.linspace(0, dur, int(sr * dur), False)
            wave = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2 * t) + 0.12 * np.sin(2 * np.pi * freq * 3 * t)
            env = np.exp(-decay * t) * np.minimum(1, t / 0.02)
            data = (wave * env * 9000).astype(np.int16)
            snd = pygame.mixer.Sound(buffer=data.tobytes())
            self._cache[key] = snd
        return snd

    def play(self, freq: float, dur: float = 0.6, decay: float = 5.0, gain: float = 1.0) -> None:
        if not (self.enabled and self.ok) or self.volume <= 0:
            return
        try:
            snd = self._tone(freq, dur, decay)
            snd.set_volume(min(1.0, self.volume * gain))
            snd.play()
        except pygame.error:
            pass

    def note(self, i: int) -> None:
        self.play(PENTATONIC[i % len(PENTATONIC)])

    def good(self) -> None:
        self.play(523.25, 0.5, 6, 0.8)

    def soft(self) -> None:
        self.play(196.0, 0.45, 7, 0.45)

    def tick(self) -> None:
        self.play(659.25, 0.18, 14, 0.4)

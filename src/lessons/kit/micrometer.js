// 长度单位 mm，旋转单位为圈。正向旋转使测微螺杆退离测砧。
export const SCREW_PITCH = 0.5;
export const THIMBLE_DIVISIONS = 50;

export function turnSpindle(gap, turns, specimen, ratchet = false) {
  const requested = gap + turns * SCREW_PITCH;
  const opening = Math.max(specimen, Math.min(25, requested));
  return { gap: opening, slipped: ratchet && turns < 0 && requested < specimen - 1e-9 };
}

export function micrometerReading(gap) {
  // 估读到千分位。先按半毫米进位，再算微分筒读数，避免出现第 50 格。
  const microns = Math.round(gap * 1000);
  const pitchMicrons = SCREW_PITCH * 1000;
  return {
    sleeve: Math.floor(microns / pitchMicrons) * SCREW_PITCH,
    division: ((microns % pitchMicrons) * THIMBLE_DIVISIONS) / pitchMicrons,
  };
}

/** Identity stays stable; status colours are a separate scale/lamp layer. */
export const tokens={channel:{power:'var(--channel-power)',voltage:'var(--channel-power)',current:'var(--channel-power)',energy:'var(--channel-power)',balance:'var(--channel-power)',budget:'var(--channel-power)',relay:'var(--channel-power)',signal:'var(--channel-power)',trust:'var(--channel-power)',temperature:'var(--channel-power)'},status:{ok:'var(--status-ok)',warn:'var(--status-warning)',danger:'var(--status-danger)',pending:'var(--status-pending)',unknown:'var(--status-unknown)'}} as const;

export const metadataPalette={brand:'#234b3d',surface:'#fafbf7',onBrand:'#f3f7e9',iconLetterRatio:.48};

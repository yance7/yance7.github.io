# Home project video derivatives

The site owner supplied and authorized the three loops for this site on 2026-11-21. Authorization does not establish copyright ownership or third-party reuse rights. Originals remain outside the repository.

| Project | Original bytes | Published MP4 bytes |
| --- | ---: | ---: |
| Maize | 2,071,866 | 376,780 |
| FishFreshNet | 2,466,281 | 673,682 |
| FreshEye | 12,061,754 | 1,248,531 |

The published videos use H.264, 1200 × 840, 30 fps, yuv420p, no audio and fast-start MP4 layout. For each source, generate the MP4 and first-frame JPEG with FFmpeg:

```sh
ffmpeg -i INPUT.mp4 -map_metadata -1 -an -vf 'scale=1200:840,fps=30' -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -movflags +faststart OUTPUT.mp4
ffmpeg -i INPUT.mp4 -map_metadata -1 -frames:v 1 -vf 'scale=1200:840' -q:v 3 POSTER.jpg
```

The JPEGs were then re-encoded with Pillow 92 quality into newly allocated RGB images to remove the encoder comment. A clean automated image audit does not verify visible content or third-party rights.

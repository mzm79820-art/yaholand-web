# 사운드

## BGM
10곡 플레이리스트로 재생됩니다. 접속할 때마다 순서를 무작위로 섞고,
한 곡이 끝나면 다음 곡으로 넘어갑니다. 한 바퀴를 다 돌면 다시 섞습니다.

| 파일 | 곡 이름 |
|------|---------|
| `bgm-8bit.mp3` | 8비트 EDM |
| `bgm-cat.mp3` | 바운시 캣 |
| `bgm-runway.mp3` | 패션 런웨이 |
| `bgm-retro.mp3` | 리빈 잇 업 |
| `bgm-loop.mp3` | EDM 루프 |
| `bgm-runway2.mp3` | 패션 런웨이 II |
| `bgm-bash.mp3` | 하이스쿨 배시 |
| `bgm-promo.mp3` | 인스파이어링 프로모 |
| `bgm-cyberpunk.mp3` | 사이버펑크 |
| `bgm-sports.mp3` | EDM 스포츠 |

원본은 MotionElements wav 파일이며 저장소에는 올리지 않습니다.
변환 설정: `libmp3lame`, 128kbps, 44.1kHz 스테레오. (모바일 로딩 고려)

```
ffmpeg -i 원본.wav -vn -ac 2 -ar 44100 -codec:a libmp3lame -b:a 128k public/audio/bgm-이름.mp3
```

곡을 추가·교체하려면 mp3를 이 폴더에 넣고 `public/js/app.js`의 `BGM_TRACKS`
목록을 수정하세요.

## 효과음(SFX)
가위바위보·주사위·낚시·채굴·검 강화·던전 공격 효과음은
브라우저 Web Audio로 생성됩니다. (별도 mp3 파일 없음)

우상단 ♪ 버튼으로 BGM과 효과음을 함께 끄고 켤 수 있고,
⏭ 버튼으로 다음 곡으로 넘길 수 있습니다.

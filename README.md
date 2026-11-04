# alid extension template

`owner/repo`로 설치할 수 있는 alid 확장 저장소 템플릿입니다. 예제 **스티키 노트**는 캔버스 도구 선반에 추가 버튼을 제공하고, 노트의 제목·메모·배경색을 속성 패널에서 편집합니다. 생성과 속성 편집은 호스트의 Undo 타임라인을 사용합니다.

## 바로 설치하기

alid의 **확장 관리 → GitHub에서 설치**에 `jiwonme/alid-extension-template`을 입력하세요. 저장소와 버전을 확인하고 신뢰를 승인한 뒤 설치합니다. 캔버스 왼쪽 도구 선반의 **스티키 노트 추가** 또는 명령 팔레트의 같은 명령으로 노트를 만듭니다.

이 예제는 앱 안에서 실행되는 신뢰 확장입니다. DOM·호스트 서비스에 접근할 수 있으며, manifest의 접근 범위는 설명용 메타데이터입니다. 권한을 강제하는 샌드박스가 아닙니다. 조회만 할 때는 플러그인을 실행하지 않으며, 설치를 승인한 소스와 커밋을 로컬에 보관합니다. 업데이트하려면 저장소를 다시 조회하고 새 코드를 승인해야 합니다. 설치·제거 자체는 문서 객체를 만들거나 지우지 않습니다.

## 내 확장 만들기

1. 이 저장소에서 **Use this template → Create a new repository**를 선택하고 **공개 저장소**를 만듭니다.
2. 새 저장소를 clone하고 `extension.json`의 `id`, `title`, `version`, `summary`를 수정합니다. `id`에는 `yourname.reading-notes`처럼 고유한 네임스페이스를 사용하세요. 예제의 어스펙트와 명령 ID는 이 값에서 생성됩니다.
3. Node.js 22.12 이상과 pnpm 11.22.0을 준비합니다.

```sh
pnpm install --frozen-lockfile
pnpm test
```

4. `src/index.js`를 수정하고 `pnpm test`를 다시 실행합니다.
5. 소스와 함께 **`dist/plugin.js`, `alid.extension.json`**을 커밋하고 기본 브랜치에 푸시합니다. `pnpm-lock.yaml`도 커밋해야 합니다.
6. alid에서 새 `owner/repo`를 입력해 설치합니다. 별도의 웹 호스팅이나 npm 배포는 필요하지 않습니다.

예제의 공개 설치본과 새 저장소를 동시에 설치하려면 먼저 `id`를 바꾸세요. 기존 사용자에게 업데이트할 때는 `id`와 어스펙트 ID를 유지하고 `version`을 올립니다. 파괴적인 스키마 변경은 새 어스펙트 ID를 사용해야 합니다.

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `extension.json` | 개발자가 편집하는 이름·ID·버전 |
| `src/index.js` | 공개 `ExtensionSpec` 구조를 따르는 예제 |
| `vite.config.js` | 단일 ESM 번들 생성 |
| `scripts/build.mjs` | 빌드와 설치 manifest·SHA256 생성 |
| `dist/plugin.js` | 브라우저가 설치하는 코드, Git에 포함 |
| `alid.extension.json` | 설치 명세, Git에 포함 |
| `test/plugin.test.mjs` | 무결성·생성·해제·순수 파생·출판 검증 |
| `.github/workflows/check.yml` | 테스트 및 커밋된 산출물 최신 여부 확인 |

## 설치 명세

호스트는 공개 GitHub 저장소의 기본 브랜치를 커밋 SHA로 고정한 뒤, 같은 커밋에서 `alid.extension.json`과 번들을 읽습니다. `apiVersion`은 현재 `1`입니다.

```json
{
  "apiVersion": 1,
  "id": "yourname.reading-notes",
  "title": "Reading notes",
  "version": "0.1.0",
  "summary": "독서 메모를 추가합니다.",
  "entry": "dist/plugin.js",
  "sha256": "빌드 시 생성되는 64자리 SHA256",
  "aspectIds": ["yourname.reading-notes.note"],
  "capabilities": {
    "readAspects": ["yourname.reading-notes.note", "core.transform", "core.bounds"],
    "writeAspects": ["yourname.reading-notes.note", "core.transform", "core.bounds"],
    "services": ["canvas.creation"],
    "commands": ["yourname.reading-notes:add-note"]
  }
}
```

`scripts/build.mjs`가 예제의 어스펙트·명령·접근 범위를 생성합니다. 기능을 추가하면 이 메타데이터도 함께 바꾸세요. 생성된 SHA256을 직접 수정하거나 산출물 대신 TypeScript 원문 경로를 지정하지 마세요. 개인 저장소, 액세스 토큰, npm 의존성의 런타임 설치는 이 방식에서 지원하지 않습니다.

## 공개 API 사용 원칙

- `default` export는 `ExtensionSpec` 형태의 객체입니다. `activate(context)`는 정리 함수를 반환합니다. 이 예제는 `context.commands.register()`의 해제 함수를 그대로 반환합니다.
- `canvas.creation` 서비스가 객체의 내용·위치·크기를 한 배치와 한 Undo 단위로 만듭니다. 확장은 `core.transform`과 `core.bounds`를 중복 작성하지 않습니다.
- 저장할 내용은 `defaults`와 정본 어스펙트로, 좌표·출판 기하는 순수 `derive()` 결과로 분리합니다. 화면 조회나 설치 중 정본을 수정하지 않습니다.
- `ui.controls`의 `tool-shelf` action으로 생성 도구를 기여합니다. 호스트의 툴바를 직접 수정하지 않습니다.
- DOM 콘텐츠와 화면 밖 SVG 출판을 함께 제공합니다. 외곽 위치·회전·카메라는 호스트가 관리합니다.
- `@alid/kernel`은 현재 독립 npm SDK로 배포되지 않았습니다. 이 템플릿은 런타임 의존성이 없는 JavaScript와 공개 구조 계약을 사용하며, 존재하지 않는 SDK 패키지를 설치하도록 안내하지 않습니다.
- 다른 라이브러리를 사용하면 번들에 포함하세요. 설치 코드는 Blob URL에서 실행되므로 상대 경로 청크·CSS·에셋 import를 남기면 안 됩니다. 이 빌드는 산출물이 한 파일인지 검사합니다.
- React 확장으로 바꿀 때는 호스트의 import map에 있는 `react`, `react-dom`, JSX 런타임과 `@alid/react`를 사용하고 중복 React 루트를 만들지 마세요. 현재 예제는 React를 사용하지 않습니다.

예제 작성에 필요한 구조 계약과 호스트 서비스는 이 저장소의 [확장 API 안내](docs/api.md)에 정리했습니다. alid 원본 저장소에 접근하지 않아도 이 템플릿을 수정하고 빌드할 수 있습니다. 빌드는 [Vite library mode](https://vite.dev/guide/build.html#library-mode)를 사용합니다.

## 검증 범위

`pnpm test`는 실제 번들을 import해 manifest 해시·생성 명령·정리 함수·정본 읽기 전용 파생·출력 이스케이프·선언형 속성을 확인합니다. CI는 재빌드 후 산출물의 Git diff가 없는지 확인합니다. 브라우저에서 설치·선택·이동·리사이즈·속성 편집·Undo·SVG 내보내기를 추가로 확인하세요. 이 템플릿은 1,000개 객체의 120fps나 0-GC 달성을 주장하지 않습니다.

MIT License.

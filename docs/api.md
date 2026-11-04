# 예제에서 사용하는 확장 API

이 문서는 이 템플릿이 사용하는 구조 계약의 안내입니다. npm SDK나 전체 호스트 API 선언은 아닙니다. 별도 패키지를 import하지 않고 아래 형태의 JavaScript 객체를 반환하면 됩니다. `src/index.js`가 실행 가능한 예제입니다.

## 설치 단위

번들의 기본 export는 다음 형태입니다.

```js
export default {
  id: 'yourname.reading-notes',
  summary: '독서 메모를 추가합니다.',
  aspects: [noteAspect],
  ui: { controls: [createButton] },
  activate(context) {
    // 명령·이벤트·서비스 등을 등록하고 정리 함수를 반환합니다.
    return () => {};
  },
};
```

`id`와 `summary`는 필수입니다. `aspects`, `ui`, `activate`는 기능에 따라 생략할 수 있습니다. 설치 단위의 ID는 `alid.extension.json`의 ID와 일치해야 합니다. 등록·활성화 도중 문서 객체를 자동 생성하지 마세요. 사용자의 명시적인 명령이 문서를 변경하게 만드세요.

`activate`가 반환하는 함수는 비활성화·다시 불러오기·제거 시 호출됩니다. 등록한 명령, 이벤트 리스너, 타이머와 구독을 여기에서 정리하세요. 여러 자원을 만들었다면 생성의 역순으로 정리합니다.

## 객체 어스펙트

어스펙트는 저장할 속성과 읽기 전용 파생·표시 동작을 정의합니다.

| 필드 | 예제에서의 의미 |
| --- | --- |
| `id` | 고유한 어스펙트 이름. 예: `yourname.reading-notes.note` |
| `label`, `summary` | 사용자에게 보이는 이름과 설명 |
| `defaults` | JSON으로 저장 가능한 속성 기본값 |
| `textFields` | 협업 텍스트로 취급하는 `defaults`의 필드 이름 |
| `textSearchFields` | 검색 대상으로 제공하는 텍스트 필드 이름 |
| `dependsOnCanonical` | 파생 계산이 읽는 정본 어스펙트 목록 |
| `dependsOnComputed` | 파생 계산이 읽는 다른 파생값 목록. 이 예제는 빈 배열 |
| `derive(props, entityId, view)` | 정본을 읽어 화면용 기하를 반환하는 순수 함수 |
| `renderDom(content, props, derived, entityId)` | 호스트가 준 콘텐츠 컨테이너에 표시 |
| `renderSvg(props, derived, entityId)` | `{ layer: 'underlay' 또는 'overlay', svg: 문자열 }` 반환 |
| `ui.controls` | 이 어스펙트의 속성을 편집하는 선언형 컨트롤 |

`derive`의 `view.getCanonical(entityId, aspectId)`는 해당 객체의 저장된 어스펙트를 읽으며 없으면 `undefined`를 반환합니다. 예제는 `core.transform`의 `x`, `y`, `rotation`과 `core.bounds`의 `width`, `height`를 읽습니다. 회전 값은 라디안입니다. 높이가 없으면 예제 자체의 결정론적인 기본값을 사용합니다.

예제의 파생 객체는 `{ x, y, width, height, rotation, zOrder }`입니다. 이 값은 화면과 출판을 위해 계산할 뿐 `defaults`나 문서에 다시 저장하지 않습니다. 파생 함수 안에서는 문서 쓰기, DOM 접근, 네트워크 요청을 하지 마세요.

DOM 콜백은 **안쪽 콘텐츠만** 소유합니다. 바깥 컨테이너의 좌표·회전·카메라 변환은 호스트가 처리합니다. 콘텐츠에 이벤트나 구독을 만들었다면 `renderDom`에서도 정리 함수를 반환할 수 있습니다. 시각 객체는 DOM이 없어도 내보낼 수 있도록 SVG 경로를 함께 제공하세요. SVG 문자열의 사용자 입력은 이스케이프하고 색상 등 속성값도 검증해야 합니다.

## 생성 서비스와 명령

`context.services.get('canvas.creation')`으로 생성 서비스를 얻습니다. 서비스가 없으면 이 기능을 제공하지 않는 호스트이므로 명확한 오류를 반환하세요.

```js
const creation = context.services.get('canvas.creation');
if (!creation) throw new Error('canvas.creation 서비스가 필요합니다.');

return context.commands.register({
  id: 'yourname.reading-notes:add-note',
  title: '독서 메모 추가',
  summary: '현재 화면에 메모를 추가합니다.',
  shortcutScope: 'canvas',
  run: () => creation.create({
    caller: 'yourname.reading-notes:add-note',
    aspects: { 'yourname.reading-notes.note': { title: '새 메모' } },
    width: 240,
    height: 160,
  }),
});
```

`commands.register`는 해제 함수를 반환합니다. 명령 ID는 `namespace:name` 형태이고 이름·설명·`run` 구현이 필요합니다. `keys`는 선택적인 단축키 문자열 배열입니다. 이 예제는 기존 편집 단축키와 충돌하지 않도록 키를 지정하지 않습니다.

`creation.create`는 생성된 엔티티 ID를 반환합니다. `aspects`에는 등록한 객체의 **내용**만 넣습니다. `core.transform`·`core.bounds`는 호스트가 가시 영역의 위치와 요청한 크기로 작성합니다. `width`와 `height`는 유한한 양수여야 합니다. 호스트가 생성 전체를 한 정본 배치와 한 Undo 단위로 처리합니다.

## 도구 선반과 속성

도구 선반 버튼은 설치 단위의 `ui.controls`에 아래 action을 추가합니다.

```js
{
  id: 'add-note',
  kind: 'action',
  label: '독서 메모 추가',
  icon: 'document',
  commandSymbol: 'yourname.reading-notes:add-note',
  placement: 'tool-shelf',
  requiresSelection: false,
}
```

`commandSymbol`은 등록한 명령 ID와 같아야 합니다. `requiresSelection: false`이므로 선택한 객체가 없어도 버튼이 나타납니다. `icon`은 호스트가 아는 공통 아이콘 이름이며 예제는 `document`를 사용합니다.

속성 컨트롤은 **어스펙트의** `ui.controls`에 둡니다. `field`는 그 어스펙트의 `defaults`에 존재하는 속성이어야 합니다.

```js
{ id: 'title', kind: 'text', field: 'title', label: '제목', placement: 'inspector' }
{ id: 'color', kind: 'color', field: 'color', label: '배경색', placement: 'inspector' }
```

호스트가 선택된 객체의 필드를 읽고 편집·Undo를 처리합니다. 확장 코드가 패널 DOM이나 현재 선택을 직접 조작할 필요가 없습니다.

## 신뢰와 호환성

이 설치 형식은 사용자가 승인한 뒤 앱 안에서 코드를 실행합니다. `capabilities`는 사용자에게 접근 의도를 설명하는 메타데이터이며 샌드박스 권한표가 아닙니다. 예제는 DOM 콘텐츠, 생성 서비스, 자기 명령만 사용합니다.

문서에 저장되는 어스펙트 ID와 속성은 업데이트 후에도 유지하세요. 파생 기하·함수·DOM 노드·타이머·Blob URL을 문서 속성에 저장하지 마세요. 비활성화하거나 제거하더라도 저장된 객체 데이터를 지우지 않는 것이 계약입니다.

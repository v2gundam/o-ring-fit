# O-Ring Fit 기술 조사 기록

- 문서 상태: 조사 초안
- 버전: 0.1
- 작성일: 2026-08-22
- 적용 범위: 정적 축방향 면 씰, AS568 및 legacy AN 형번, 비원형 글랜드, DXF 출력

## 1. 조사 목적

제품 요구사항에 사용될 오링 선정·글랜드 설계 기준을 공개 인터넷 자료로 조사하고, 앱 계산에 사용할 수 있는 근거와 추가 검증이 필요한 내용을 구분한다.

이 문서는 설계 표준 자체를 대체하지 않는다. 실제 수치 데이터베이스를 배포하기 전에는 최신 유료 규격, 제조사 적용 조건, 데이터 재배포 권한 및 실제 시험 결과를 별도로 확인해야 한다.

### 도브테일 및 하프 도브테일 유지 홈

- Parker O-Ring Handbook Design Chart 4-4와 4-5를 MVP 치수 근거로 사용한다.
- 도브테일은 조립·정비 중 오링을 유지하는 데 유용하지만 가공비가 높고 일반적으로 권장되는 기본 홈은 아니다.
- 제한된 빈 공간 때문에 넓은 온도 범위, 일반 공차 극단 또는 높은 엘라스토머 팽윤을 허용하기 어렵다.
- 입구 반경 `R`은 설치 손상과 압출 위험에 직접 영향을 주므로 표의 고정값을 사용한다.
- 단면 각도는 66°이며 평균 홈 직경은 평균 오링 직경과 일치시킨다.
- 공식 근거: [Parker Dovetail and Half-Dovetail Design Charts](https://www.parker.com/content/dam/Parker-com/Literature/O-Ring-Division-Literature/O-Ring-ehandbook-pdfs/Dovetail-and-half-dovetail-design-charts.pdf)

### 비원형 홈의 모서리 반경 안내

- Parker는 직사각형 면 씰 홈의 실제 안쪽 모서리 반경을 최소 `3 × CS`, 이상적으로 `6 × CS`로 권고한다. 이보다 작은 반경은 코너에서 오링의 좌굴·주름과 설치 어려움을 키울 수 있다.
- 앱의 `홈 중심선 모서리 R` 입력값은 실제 안쪽 가공 모서리와 다르다. 따라서 `중심선 R = 실제 안쪽 R + 홈 최대 폭 ÷ 2`로 변환해 최소·권장 입력값을 표시한다.
- 도브테일과 하프 도브테일은 평면상 최대 바닥 폭을 홈 최대 폭으로 사용한다.
- 공식 근거: [Parker O-Ring Handbook ORD 5700](https://www.parker.com/content/dam/Parker-com/Literature/O-Ring-Division-Literature/ORD-5700.pdf), [Parker O-Ring FAQ](https://www.parker.com/Literature/O-Ring%20Division%20Literature/FAQ.pdf)

## 2. 자료 신뢰도 원칙

자료는 다음 우선순위로 사용한다.

1. SAE, ISO, 미국 DLA/ASSIST 등 규격 발행기관과 정부 공식 기록
2. Parker, Trelleborg, Apple Rubber 등 씰 제조사의 설계 핸드북
3. Autodesk 등 대상 CAD 제품의 공식 문서
4. 제조·가공 업체의 기술 블로그와 기타 설명 자료

2차 자료에 제시된 수치가 공식 핸드북과 다르면 공식 자료를 우선한다. 서로 다른 제조사 핸드북의 수치도 하나의 범위로 임의 병합하지 않고 `설계 기준 프로파일`별로 구분한다.

## 3. WayKen 글 검토

검토 자료:

- [WayKen O-링 홈 설계 가이드](https://waykenrm.com/ko/blogs/o-ring-groove-design-guide/)

### 3.1 유용한 내용

- face, dovetail, half-dovetail, crush gland 등 글랜드 유형을 쉽게 설명한다.
- 글랜드 깊이, 너비, 압축률, 충전율, 재질 및 가공 관점의 검토 항목을 소개한다.
- 비전문 사용자에게 오링 글랜드 설계 흐름을 설명하는 UX 참고자료로 유용하다.

### 3.2 계산 기준으로 직접 사용하지 않는 이유

- 글랜드 높이 공식의 표기가 차원상 일관되지 않는다.
- ID, OD, 단면 직경 및 글랜드 깊이를 혼용한 것으로 보이는 문장이 있다.
- 일부 일반 압축률 설명은 공식 face-seal 설계표의 범위와 차이가 크다.
- 표의 원출처, 적용 조건, 공차 조건 및 규격 개정판을 추적하기 어렵다.
- 번역 과정에서 squeeze, compression set, gland depth 등의 용어가 혼동될 가능성이 있다.

따라서 WayKen 글은 개념 설명과 조사 키워드 발굴용으로만 사용하고, 앱의 계산식·통과 기준·DXF 가공 치수에는 직접 사용하지 않는다.

## 4. 정적 축방향 면 씰

### 4.1 압력 방향과 기준 지지벽

정적 면 씰의 오링은 압력이 인가되기 전부터 저압측 글랜드 벽에 위치하도록 설계하는 것이 기본 원칙이다.

| 운전 조건 | 압력 방향 | 저압측 지지벽 | 주요 기준 치수 |
|---|---|---|---|
| 챔버 내부 가압 | 반경 바깥쪽 | 글랜드 외경 벽 | 오링 평균 OD와 글랜드 OD |
| 외부 가압 | 반경 안쪽 | 글랜드 내경 벽 | 오링 평균 ID와 글랜드 ID |
| 챔버 내부 진공 | 외부에서 안쪽 | 글랜드 내경 벽 | 오링 평균 ID와 글랜드 ID |

앱 구현에서는 이 기준을 단순 화살표 표시에 그치지 않고 실제 홈 경로에 적용한다. 직사각형 단면 면 씰에서 내부 가압은 홈 바깥 경계를 오링 평균 OD에, 내부 진공·외부 가압은 홈 안쪽 경계를 오링 평균 ID에 맞춘다. 진공과 기체의 홈 폭·깊이는 Design Chart 4-3에서 동일하고, 액체만 팽윤 여유 때문에 더 넓은 홈 폭을 사용한다.

근거:

- [Parker O-Ring Handbook ORD 5700](https://www.parker.com/content/dam/Parker-com/Literature/O-Ring-Division-Literature/ORD-5700.pdf)
- [Parker Prädifa O-Ring Handbook](https://www.parker.com/content/dam/Parker-com/Literature/Praedifa/Catalogs/Catalog_O-Ring-Handbook_PTD5705-EN.pdf)
- [Apple Rubber Static Seal Types](https://www.applerubber.com/seal-design-guide/seal-types-and-gland-design/static-seal-types/)

압력 방향이 운전 중 반전되면 단일 지지벽 기준으로 자동 승인하지 않는다. 양방향 압력, 최대 차압, 압력 사이클, 양쪽 간극 및 리테이너/백업링을 별도 검토해야 한다.

### 4.2 압축률

기본식:

```text
축방향 압축률(%) = (오링 CS - 조립 후 글랜드 높이) / 오링 CS × 100
```

공칭값만 계산하면 안 된다. 최소·최대 CS, 글랜드 깊이 공차, 접합면 평탄도, 플랜지 변형 및 제조 공차를 조합하여 최소·최대 압축률을 계산해야 한다.

공식 자료는 단면과 적용 조건에 따라 서로 다른 권장 범위를 제시한다. 일반적인 `20%` 또는 `10~40%`를 모든 경우의 합격 기준으로 사용하지 않는다. 앱은 선택한 설계 프로파일의 단면별 표를 사용해야 한다.

참고 자료:

- [Parker O-Ring Handbook ORD 5700](https://www.parker.com/content/dam/Parker-com/Literature/O-Ring-Division-Literature/ORD-5700.pdf)
- [Apple Rubber Seal Design Guide PDF](https://www.applerubber.com/src/pdf/seal-design-guide.pdf?v=3)

### 4.3 글랜드 충전율

기본식:

```text
글랜드 충전율(%) = 최대 오링 단면적 / 최소 조립 글랜드 단면적 × 100
오링 공칭 단면적 = π × CS² / 4
```

일반 글랜드에서는 공차, 온도 팽창 및 유체 팽윤을 수용할 빈 공간이 필요하다. Parker는 일반적으로 약 60~85%, 최적값 약 75%를 설명하고 Apple Rubber는 최대 오링 체적이 최소 글랜드 공간의 90%를 넘지 않도록 권고한다.

고진공용 고충전 설계는 일반 규칙과 분리해야 한다. 고진공에서 높은 충전율 또는 추가 압축을 적용할 수 있지만, 큰 체결하중·열팽창·공차·outgassing·permeation을 함께 검토하며 자동 합격값으로 사용하지 않는다.

### 4.4 액체와 기체·진공

- 액체용 글랜드는 재질 팽윤을 수용하기 위해 상대적으로 넓은 폭이 사용될 수 있다.
- 기체·진공용 글랜드는 dead volume과 갇힌 기체를 줄이기 위해 더 좁은 폭이 사용될 수 있다.
- 기체·진공은 글랜드 폭 외에도 누설률, 표면거칠기, 재질 투과율 및 outgassing 검토가 필요하다.
- RMS와 Ra는 동일한 척도가 아니므로 앱에서 무조건 1:1 변환하지 않는다.

최신 ISO housing 기준은 [ISO 3601-2:2025](https://www.iso.org/standard/85921.html)이다. 표 전체는 유료 규격이므로 정식 구매본과 이용권한을 확인해야 한다.

### 4.5 신장과 둘레 압축

- 제조사 일반 지침은 설치 신장을 대략 5~6% 이하로 제한한다.
- 2~3% 이상의 신장부터는 단면 감소가 압축률에 미치는 영향을 계산해야 한다.
- 내부 가압용 외경 기준 배치에서 둘레 압축이 생기면 좌굴과 주름을 검토해야 하며, 일반적으로 1~3% 이내 지침이 사용된다.
- 입력값과 결과에는 `ID 신장률`, `중심선 길이 변화율`, `둘레 압축률`을 구분해 표시한다.

### 4.6 표면, 모서리 및 조립

- 일반 정적 면 씰과 기체·진공 면 씰의 표면거칠기 기준을 구분한다.
- 가공흔 방향과 긁힘은 Ra 값과 별개로 누설 경로가 될 수 있다.
- 오링이 통과하는 나사, 슬롯, 구멍 및 날카로운 모서리는 제거하거나 조립 슬리브로 보호한다.
- 일반 바닥 반경과 압출 간극 쪽 모서리 반경을 같은 값으로 취급하지 않는다.
- lead-in chamfer와 조립 윤활은 재질·유체 호환성을 포함해 안내한다.

### 4.7 고압과 백업링

고압 적합성은 압력값 하나로 판정할 수 없다. 다음이 함께 필요하다.

- 최대 차압
- 최대 운전 압출 간극
- 오링 재질과 경도
- 최대 온도와 재질 연화
- 정압, 맥동 및 진동
- 플랜지와 체결볼트의 탄성 변형

Parker는 103.5 bar(1500 psi)를 넘는 적용에서 백업링 필요성을 조사하도록 안내하지만, 이를 절대 합격/불합격 경계로 사용하지 않는다. 금속-금속 접촉으로 실제 간극이 0에 가깝다면 더 높은 압력도 가능할 수 있고, 반대로 진동과 플랜지 breathing이 있으면 더 낮은 압력에서도 백업링이 필요할 수 있다.

앱에서 최대 운전 간극이나 구조 변형 정보가 없으면 구체적인 고압 적합성을 `판정 불가`로 표시한다.

## 5. 둥근 사각형 및 비원형 패스

### 5.1 패스 길이

가로 `W`, 세로 `H`, 중심선 모서리 반경 `R`인 둥근 사각형의 중심선 길이:

```text
Lpath = 2(W + H - 4R) + 2πR
```

자유 상태 오링의 단면 중심선 길이:

```text
L0 = π(ID + CS)
```

중심선 기준 설치 길이 변화율:

```text
변화율(%) = (Lpath / L0 - 1) × 100
```

중심선 변화율은 유용한 보조값이지만, 제조사 한계가 오링 ID 신장 또는 OD 압축을 기준으로 주어지는 경우가 있으므로 같은 값으로 취급하지 않는다.

### 5.2 최소 모서리 반경

Apple Rubber는 표준 원형 오링을 직사각형 face-seal 홈에 사용할 때 안쪽 모서리 반경을 최소 `3 × CS`로 권고한다. Parker는 최소 `3 × CS`, 이상적으로 `6 × CS`를 권고한다.

앱 판정안:

| 중심선/안쪽 모서리 반경 | 판정 |
|---|---|
| `R < 3 × CS` | 표준 원형 오링 사용 비권장/오류 |
| `3 × CS ≤ R < 6 × CS` | 조건부 경고 |
| `R ≥ 6 × CS` | 이상적 범위 |

반경의 기준이 중심선인지 글랜드 안쪽 경계인지 자료마다 구분해야 한다. 앱 내부에서는 글랜드 안쪽 실제 경계 반경을 기준으로 우선 검증하고, UI에 치수 기준을 명확히 표시한다.

근거:

- [Apple Rubber Non-Round Face Seal Applications](https://www.applerubber.com/seal-design-guide/special-elastomer-applications/face-seal-applications-non-round/)
- [Parker O-Ring Handbook ORD 5700](https://www.parker.com/content/dam/Parker-com/Literature/O-Ring-Division-Literature/ORD-5700.pdf)

### 5.3 표준 원형 오링의 적용 한계

비원형 홈에서는 다음 위험을 표시한다.

- 바깥쪽 섬유의 국부 인장
- 안쪽 섬유의 좌굴과 주름
- 단면 타원화와 압축률 감소
- 직선부와 모서리의 압축률 편차
- 조립 중 비틀림과 위치 편차

길이만 일치한다고 적합 판정을 내리지 않는다. 고진공, 기체, 고압, zero-leak 및 안전 중요 용도이거나 모서리 반경이 작으면 one-piece 맞춤 성형, continuous-vulcanized seal 또는 제조사 검토를 우선 안내한다.

접착 또는 splice된 코드 오링은 대형·소량·저위험 적용에서 경제적일 수 있지만, 접합부와 단면 편차가 누설·강도 약점이 될 수 있다.

관련 자료:

- [Parker XXL Sealing Solutions](https://www.parker.com/content/dam/Parker-com/Literature/Praedifa/Brochures/XXL_Sealing_Solutions_PTD3031_EN.pdf)
- [Parker Custom Molded Corner 사례](https://discover.parker.com/extruded-hollow-d-molded-corners-custom-seals)

## 6. AS568 규격 데이터

### 6.1 현행 규격

조사 시점의 현행 기준은 `SAE AS568F`이며 SAE 기록상 2026-01-29 reaffirmed 상태이다.

- [SAE AS568 공식 페이지](https://saemobilus.sae.org/standards/as568-aerospace-size-standard-o-rings)

앱 메타데이터에는 규격명, revision, revised date, reaffirmed date와 실제 데이터 구매본의 식별정보를 저장한다.

### 6.2 유효 dash 범위

| 계열 | 유효 dash | 행 수 | 대표 실제 CS |
|---|---:|---:|---:|
| 소형 | 001–050 | 50 | .040, .050, .060, .070 inch |
| 100 | 102–178 | 77 | .103 inch |
| 200 | 201–284 | 84 | .139 inch |
| 300 | 309–395 | 87 | .210 inch |
| 400 | 425–475 | 51 | .275 inch |
| boss | 901–914, 916, 918, 920, 924, 928, 932 | 20 | 행별 상이 |

- 일반 오링: 349행
- boss gasket: 20행
- 전체: 369행

dash 번호를 연속 범위로 생성하지 않는다. 각 행에 ID, ID 공차, CS, CS 공차를 명시적으로 저장한다.

교차검증 자료:

- [Trelleborg AS568 O-Rings](https://www.trelleborg.com/-/media/tss-media-repository/tss_website/pdf-and-other-literature/catalogs/as568_o-rings_en.pdf?revision=3b42ea43-84a9-487d-ac91-df5d782664de)
- [Apple Rubber AS568 Quick Reference](https://www.applerubber.com/src/pdf/as568-standard-size-o-rings.pdf)

### 6.3 저작권과 데이터 재배포

- SAE 규격표 전체는 유료 저작물이므로 구매 PDF나 표를 앱에 그대로 복제·배포하지 않는다.
- 공개 제조사 표도 별도의 오픈 데이터 라이선스가 확인되지 않으면 그대로 재배포하지 않는다.
- 상용 배포 전 SAE에 데이터/표 재배포 권한을 확인하는 것이 가장 안전하다.
- 치수 사실만 독립 스키마에 입력하고, 다중 출처 검증·provenance·검수 상태를 저장하는 방법을 검토한다.
- 명시적으로 오픈 라이선스된 공식 AS568 전체 CSV는 이번 조사에서 확인하지 못했다.

법률 검토 전에는 `규격 데이터 사용 가능`을 확정하지 않는다.

## 7. AN6227 및 AN6230

AN6227과 AN6230은 현행 치수 규격이 아니라 취소된 legacy part-number 체계로 분류한다.

### 7.1 AN6227

- 최종 확인: Revision 9, 1981-07-13
- 취소: 1985-07-11
- 후속 조달 규격: MS28775, 이후 AS28775 계열
- dash 수: 88
- [DLA/ASSIST AN6227 기록](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=54707)

교차참조:

| AN6227B | AS568 |
|---:|---:|
| 1–7 | 006–012 |
| 8–14 | 110–116 |
| 15–27 | 210–222 |
| 28–52 | 325–349 |
| 53–88 | 426–461 |

### 7.2 AN6230

- 최종 확인: Revision 9, 1982-11-01
- 취소: 1993-12-01
- 후속 조달 규격: MS28775
- dash 수: 52
- 대응: `AN6230B 1–52` → `AS568 223–274`
- 변환식: `AS568 dash = AN6230 dash + 222`
- [DLA AN6230 취소 공고 및 교차표](https://quicksearch.dla.mil/Transient/7162426D80874F90B9E371D3737EC6E1.pdf)

### 7.3 앱 표시 원칙

- 검색 입력에서 AN legacy 형번을 허용한다.
- 결과의 주 형번은 AS568로 표시하고 AN은 `legacy alias`로 표시한다.
- 동일 치수라는 사실이 재질, 경도, 품질등급, 인증 및 조달 규격의 동등성을 뜻하지 않는다는 경고를 표시한다.

## 8. 규격 데이터 스키마와 검증

권장 예시:

```json
{
  "standard": "SAE AS568",
  "revision": "F",
  "dash": "214",
  "category": "general",
  "id_in": "0.984",
  "id_tol_in": "0.012",
  "cs_in": "0.139",
  "cs_tol_in": "0.004",
  "legacy_aliases": [
    {"standard": "AN6227B", "dash": "19"}
  ],
  "source_ids": ["sae-as568f", "manufacturer-crosscheck"],
  "verification_status": "verified"
}
```

원칙:

- 부동소수점 대신 decimal string 또는 정수 micro-inch를 사용한다.
- inch 원문값을 기준값으로 보존하고 mm 표시값은 명시된 반올림 규칙으로 계산한다.
- OD가 원문 필드가 아니라면 `ID + 2 × CS` 파생값으로 표시한다.
- nominal, actual 및 tolerance를 구분한다.
- 각 행에 출처, revision, retrieved date 및 검수 상태를 저장한다.
- 최소 두 제조사 표와 정식 SAE 구매본을 자동 diff한다.
- OCR 값은 생산 데이터로 바로 승인하지 않는다.

필수 구조 시험:

- 일반 행 수 349
- boss 행 수 20
- 전체 행 수 369
- AN6227 alias 수 88
- AN6230 alias 수 52
- 무효 dash 거부
- 모든 행에서 `OD = ID + 2 × CS`
- inch→mm 변환 및 반올림 검증
- 대표 형번 golden test

## 9. 브라우저 DXF 출력

### 9.1 기본 포맷 후보

- ASCII DXF R14
- `$ACADVER = AC1014`
- `$INSUNITS = 4`로 mm 명시
- `$MEASUREMENT = 1`로 metric 명시
- 모든 가공 형상은 2D, Z=0

Fusion의 단위 없는 DXF 처리와 R14 호환 안내:

- [Autodesk Fusion DXF Unit Guidance](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/A-DXF-file-does-not-contain-units-information-error-message-occurs-when-importing-a-DXF-file-to-Fusion-360.html)

최종 버전은 실제 Fusion, Inventor, AutoCAD/CAM 가져오기 시험 후 확정한다.

### 9.2 엔티티

가공 경계 기본 후보:

- 닫힌 2D `LWPOLYLINE`
- 직선과 원호를 위한 bulge 값
- 호환 모드에서는 정확히 연결된 `LINE` + `ARC`
- 단순 `TEXT` 주기

가공 경계에는 SPLINE, ELLIPSE, HATCH, DIMENSION 및 MTEXT 의존을 피한다. 한글 텍스트는 구형 DXF에서 깨질 수 있으므로 DXF 주기는 영문·숫자, 앱 화면과 PDF는 한글을 기본으로 한다.

공식 DXF 엔티티 참고:

- [Autodesk LWPOLYLINE DXF Group Codes](https://help.autodesk.com/cloudhelp/2016/ENU/AutoCAD-DXF/files/GUID-748FC305-F3F2-4F74-825A-61F04D757A50.htm)
- [Autodesk DXF Header Variables](https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-DXF/files/GUID-A85E8E67-27CD-4C59-BE61-4DC9FADBE74A.htm)

### 9.3 공통 형상 모델

미리보기와 DXF가 서로 다른 계산 결과를 만들지 않도록 다음 구조를 사용한다.

```text
오링/글랜드 계산 결과
        ↓
공통 2D 형상 모델(선, 원호, 폐곡선, 주기, 레이어)
        ├─ SVG 미리보기
        └─ ASCII DXF serializer
```

Maker.js는 둥근 사각형, line/arc, chain 검사, SVG와 DXF 출력 기능이 있어 PoC 후보이다.

- [Microsoft Maker.js](https://github.com/microsoft/maker.js)
- [Maker.js Exporting](https://maker.js.org/docs/exporting/)

생산 DXF 요구가 제한적이므로 작은 자체 ASCII serializer가 더 검증하기 쉬울 수도 있다. 라이브러리 선택은 golden DXF와 CAD 가져오기 시험 후 결정한다.

### 9.4 자동 검증

생성 전:

- 모든 좌표가 유한값인지 확인
- `W > 0`, `H > 0`, 유효 반경 확인
- 인접 선·원호 끝점 일치
- self-intersection 없음
- 폐곡선 면적 0 아님
- 의도한 winding과 레이어 확인

생성 후:

- DXF를 다시 파싱
- 단위와 버전 확인
- 엔티티 수와 레이어 확인
- closed flag 확인
- bounding box와 둘레를 공통 형상 모델과 비교
- 1 mm 기준선 축척 검증

실물 smoke test:

- Fusion에서 닫힌 프로파일로 인식되고 Extrude/Cut 선택 가능
- Inventor에서 스케치·레이어 매핑 가능
- 원호가 직선 세그먼트로 불필요하게 분해되지 않음
- 텍스트와 단위 유지

관련 Autodesk 자료:

- [Fusion DXF Import](https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/files/SLD-INS-DXF.htm)
- [Fusion Closed Profile Troubleshooting](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Unable-to-import-DXF-as-close-profiles.html)
- [Inventor Layer Mapping](https://help.autodesk.com/cloudhelp/2014/ENU/Inventor/files/GUID-54110C68-7814-4F71-9C5B-4A340272F38E.htm)

## 10. 제품에 즉시 반영할 결정

1. WayKen은 설명 자료, Parker/Trelleborg/Apple/SAE/ISO는 계산 근거로 분리한다.
2. AS568F를 현행 형번 기준으로 표시한다.
3. AN6227/AN6230은 legacy 검색 별칭으로만 제공한다.
4. 설계 기준 프로파일과 출처·개정판을 모든 결과에 표시한다.
5. 압축률과 글랜드 폭은 단일 상수가 아니라 CS·유체·진공 조건별 표를 사용한다.
6. 비원형 홈의 실제 안쪽 반경이 `3 × CS` 미만이면 표준 원형 오링을 부적합 처리한다.
7. `3 × CS` 이상 `6 × CS` 미만은 조건부, `6 × CS` 이상은 이상적 범위로 표시한다.
8. 고진공·기체·고압·zero-leak·안전 중요 비원형 씰에는 맞춤 일체형 씰 검토를 권고한다.
9. DXF는 공통 형상 모델에서 미리보기와 함께 생성하고, 생성 후 재파싱한다.
10. 상용 배포 전 AS568 데이터 재배포 권한을 확인한다.

## 11. 추가 조사 및 확보 항목

- SAE AS568F 정식 구매본 및 데이터 사용권
- ISO 3601-2:2025 정식 구매본과 최신 housing 표
- 재질·경도·온도별 팽윤 및 열팽창 데이터
- 재질·경도별 pressure-gap extrusion chart
- 고진공 등급별 재질 투과율, outgassing 및 허용 누설률
- 양방향 압력용 글랜드와 백업링 설계
- 둥근 사각형 표준 원형 오링의 실물 장착 시험
- Fusion/Inventor/AutoCAD/CAM 대상 golden DXF import 시험
- 사내에서 실제 사용하는 AS/AN 오링 규격집과 품번 체계

## 12. 조사 변경 기록

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-08-22 | 공식 규격·제조사 핸드북·CAD 문서를 중심으로 최초 조사 정리 |

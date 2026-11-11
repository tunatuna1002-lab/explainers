import {
  Page,
  TableOfContents,
  Section,
  Text,
  Callout,
  Steps,
  Table,
  useGrokTheme,
  useEffect,
  useRef,
  useState,
} from "@/components/canvas";
import { Tex } from "@/components/Tex";

/* ---------- 위젯: Claude 앱에서 만든 인터랙티브 그림을 그대로 띄운다 ---------- */

const WIDGET_DIR = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/widgets/vae-auto-encoding-variational-bayes`;

function Widget({ name, title, height, caption }: { name: string; title: string; height: number; caption?: string }) {
  const theme = useGrokTheme();
  const [h, setH] = useState(height);
  const ref = useRef<HTMLIFrameElement>(null);
  const ping = () => ref.current?.contentWindow?.postMessage({ type: "vae-widget-ping" }, "*");
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; name?: string; h?: number } | null;
      if (d && d.type === "vae-widget-height" && d.name === name && typeof d.h === "number" && d.h > 40) setH(d.h);
    };
    window.addEventListener("message", onMsg);
    ping();
    return () => window.removeEventListener("message", onMsg);
  }, [name]);
  return (
    <figure style={{ margin: 0 }}>
      <iframe
        ref={ref}
        onLoad={ping}
        src={`${WIDGET_DIR}/${name}.html`}
        title={title}
        loading="lazy"
        style={{ display: "block", width: "100%", height: h, border: 0, background: "transparent" }}
      />
      {caption ? (
        <figcaption style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/* ---------- 본문 ---------- */

export default function App() {
  return (
    <Page
      title="Auto-Encoding Variational Bayes 쉽게 보기: 재매개변수화, MCMC, 주변우도"
      summary="사후분포의 분모 p(x)는 계산할 수 없는 적분입니다. 그래서 이 논문은 log p(x) 대신 그 아래에 있는 하한 L을 키우고, 노이즈를 모델 밖으로 빼는 재매개변수화로 L의 기울기를 구합니다. 인코더가 사진마다 한 번에 분포를 내므로, 데이터마다 MCMC를 돌리지 않고 미니배치로 학습합니다."
      width="column"
      lang="ko"
    >
      <TableOfContents
        items={[
          { label: "논문의 핵심과 재매개변수화", id: "core" },
          { label: "기존 방법과 AEVB의 차이", id: "compare" },
          { label: "MCMC의 원리", id: "mcmc" },
          { label: "주변우도와 계산 불가 적분", id: "marginal" },
          { label: "차원의 저주와 정보", id: "curse" },
          { label: "베이즈 정리", id: "bayes" },
          { label: "경사상승법과 경사하강법", id: "ascent" },
          { label: "하한 L과 논문의 연결", id: "elbo" },
          { label: "KL 발산", id: "kl" },
          { label: "한눈에 보기", id: "map" },
          { label: "공부하며 바로잡은 내용", id: "fixes" },
          { label: "출처", id: "refs" },
        ]}
      />

      <Section heading="논문의 핵심과 재매개변수화" id="core">
        <Callout lead="한 장면 비유">
          사진마다 숨은 스케치가 있지만 직접 볼 수 없습니다. 맞히는 화가(인코더)가 사진을 보고 평균 스케치와 흩어짐을 말합니다. 스케치 후보는 "평균 + 흩어짐 × 표준 주사위"로 뽑고, 다시 그리는 화가(디코더)가 그 후보로 사진을 다시 그립니다.
        </Callout>
        <Table
          columns={["비유", "논문 용어", "근거"]}
          rows={[
            ["숨은 스케치", "잠재 변수(latent variable) z", "§2.1, p.2"],
            ["맞히는 화가", "인식 모델(recognition model), 확률적 인코더 q(z|x)", "§2.1, p.3"],
            ["다시 그리는 화가", "확률적 디코더 p(x|z)", "§2.1, p.3"],
            ["표준 주사위", "보조 노이즈 변수 ε", "§2.4, p.4"],
            ["평균 + 흩어짐 × 주사위", "재매개변수화(reparameterization)", "§2.4, p.4-5"],
            ["연습 점수", "변분 하한(variational lower bound) L", "§2.2, p.3"],
          ]}
        />
        <Callout lead="비유의 한계" tone="warning">
          실제 잠재 변수는 사람이 알아보는 스케치가 아니라 숫자 묶음입니다. 흩어짐도 사람이 정하지 않고 인코더가 사진마다 스스로 냅니다(§3, p.5).
        </Callout>
        <Text>
          아래 위젯에서 흩어짐을 바꿔 보십시오. 흩어짐이 작으면 → 스케치 후보가 평균 근처에 모입니다 → 다시 그린 그림이 원본과 비슷합니다.
        </Text>
        <Widget name="sigma" title="흩어짐과 재구성" height={760} caption="디코더는 학습된 신경망이 아니라 장난감 규칙입니다. 점수와 분포는 예시입니다." />
        <Table
          columns={["핵심 숫자", "값", "근거"]}
          rows={[
            ["미니배치 크기 M", "100", "알고리즘 1, p.4"],
            ["데이터당 샘플 수 L", "1", "알고리즘 1, p.4"],
            ["은닉 유닛", "MNIST 500개, Frey Face 200개", "§5, p.7"],
            ["학습 시간", "샘플 100만 개당 약 20~40분 (Intel Xeon, 실효 40 GFLOPS)", "그림 2 캡션, p.7"],
          ]}
        />
      </Section>

      <Section heading="기존 방법과 AEVB의 차이" id="compare">
        <Widget name="compare" title="기존 방법과 AEVB 비교" height={560} />
        <Text>
          온라인 알고리즘(online algorithm, 작은 묶음을 받을 때마다 모델을 바로 고치는 방법)이 핵심 차이입니다. 저자는 큰 데이터에서 미니배치로 갱신하고 싶다고 적습니다(§2.1, p.2). 몬테카를로 EM은 온라인 알고리즘이 아니어서 전체 MNIST에 효율적으로 쓸 수 없다고 적습니다(그림 3 캡션, p.8).
        </Text>
        <Steps
          steps={[
            { title: "예열(burn-in)", detail: "언덕에 도착하기 전 발자국은 버립니다(논문 밖)." },
            { title: "자기상관(autocorrelation)", detail: "이웃 발자국끼리 닮아서, 쓸 만한 샘플을 얻으려면 더 많이 걸어야 합니다(논문 밖)." },
            { title: "걸음 하나가 비쌈", detail: "HMC는 걸음마다 디코더의 기울기를 씁니다(부록 D, p.12). 몬테카를로 EM은 갱신 전에 리프프로그 10걸음을 걷습니다(부록 E, p.12)." },
            { title: "사진마다 처음부터", detail: "사후분포 p(z|x)는 사진마다 달라서, 한 사진의 발자국을 다른 사진에 쓸 수 없습니다." },
          ]}
        />
        <Text>아래 위젯에서 사진을 바꿔 가며 MCMC와 인코더를 비교해 보십시오(예시 분포).</Text>
        <Widget name="photo" title="사진마다 MCMC와 인코더" height={620} />
        <Text>
          인코더는 "사진 → 분포" 규칙 자체를 배워서 비용을 모든 사진이 나눠 씁니다. 이것을 분할 상환 추론(amortized inference)이라고 부릅니다(용어는 논문 밖). 대신 논문의 인코더는 대각 가우시안이라 봉우리가 둘인 사후분포는 정확히 따라가지 못합니다(§3, p.5).
        </Text>
        <Callout lead="결과와 한계">
          그림 2에서 AEVB는 wake-sleep보다 모든 실험에서 더 빨리 수렴하고 더 좋은 해에 도달했습니다(p.7). 이 방법은 연속 잠재 변수용입니다. wake-sleep은 이산 잠재 변수에도 쓸 수 있습니다(§4, p.6).
        </Callout>
      </Section>

      <Section heading="MCMC의 원리" id="mcmc">
        <Text>
          MCMC(마르코프 연쇄 몬테카를로)는 한 걸음씩 무작위로 걸으며 샘플을 모으는 방법입니다. 다음 걸음은 지금 위치에만 의존합니다(논문 밖).
        </Text>
        <Steps
          steps={[
            { title: "제안", detail: "현재 위치 근처의 새 위치를 무작위로 고릅니다." },
            { title: "비교", detail: "새 위치가 지금보다 몇 배 그럴듯한지 비율을 구합니다." },
            { title: "결정", detail: "더 그럴듯하면 옮깁니다. 덜 그럴듯하면 그 비율만큼의 확률로 옮깁니다. 예: 0.2 / 0.8 = 0.25이면 25% 확률로 옮깁니다(예시)." },
            { title: "기록", detail: "지금 위치를 발자국으로 남기고 반복합니다." },
          ]}
        />
        <Text>
          비교에 비율만 쓰기 때문에 → 정확한 확률 값(분모 p(x))을 몰라도 됩니다. 먼저 "100걸음"을 몇 번 눌러 보고, 걸음 크기를 아주 작게, 아주 크게 바꿔 보십시오.
        </Text>
        <Widget name="walker" title="MCMC 걸음" height={620} />
        <Text>같은 언덕에서 언덕 오르기(내려가는 걸음을 받지 않는 최적화)와 MCMC를 비교해 보십시오. 두 모드를 각각 1000걸음씩 돌리면 차이가 보입니다.</Text>
        <Widget name="hillvsmcmc" title="언덕 오르기와 MCMC" height={580} />
        <Text>
          논문이 쓴 HMC는 기울기로 오르막을 향해 걸음을 제안합니다. 하지만 무작위성과 수락 규칙 때문에 정상에 멈추지 않습니다(HMC 작동 방식은 논문 밖).
        </Text>
      </Section>

      <Section heading="주변우도와 계산 불가 적분" id="marginal">
        <Tex display>{"p(\\mathbf{x}) = \\int p(\\mathbf{z})\\, p(\\mathbf{x} \\mid \\mathbf{z})\\, d\\mathbf{z}"}</Tex>
        <Text>
          주변우도(marginal likelihood)는 가능한 모든 스케치로 그려 봤을 때 이 사진이 나올 평균 가능성입니다(§2.1, p.2). 예: 사전 0.7·0.3, 우도 0.1·0.4이면 p(x) = 0.07 + 0.12 = 0.19입니다(예시). 이 값은 사후분포의 분모이자, 학습이 원래 키우고 싶은 값입니다.
        </Text>
        <Table
          columns={["계산 불가가 되는 경우", "내용", "1차원이면"]}
          rows={[
            ["닫힌 식 없음", "적분 결과를 익숙한 함수로 쓸 수 없음 (예: e^(−x²), 논문 밖)", "수치 적분으로 쉽게 풀림"],
            ["차원의 저주", "차원당 k개 점이면 격자점 k^d개", "해당 없음"],
            ["샘플이 빗나감", "사전분포에서 뽑은 z 대부분이 이 사진을 설명하지 못함", "비교적 덜 심함"],
          ]}
        />
        <Text>격자 적분의 비용을 직접 바꿔 보십시오. 10개 점, 20차원이면 10^20개이고, 초당 10억 회로 약 3,169년입니다(예시, 계산으로 확인).</Text>
        <Widget name="gridcost" title="격자 적분 비용" height={560} />
        <Text>무작위 샘플로 어림하면 대부분 빗나갑니다. 영역 반지름을 줄여 보십시오.</Text>
        <Widget name="priormiss" title="사전 샘플이 빗나감" height={520} />
        <Callout lead="VAE에서는 세 경우가 겹칩니다" tone="warning">
          디코더가 비선형 은닉층 신경망이라 적분이 계산 불가입니다(§2.1, p.2; 부록 C, p.11). 잠재 차원은 MNIST에서 3부터 200까지입니다(그림 2, p.7). 주변우도 추정은 잠재 3차원에서만 했고, 더 높은 차원에서는 추정을 믿을 수 없었습니다(§5, p.7; 부록 D, p.11).
        </Callout>
      </Section>

      <Section heading="차원의 저주와 정보" id="curse">
        <Text>
          차원의 저주(curse of dimensionality)는 정보를 없애지 않습니다. 잡음 차원이 늘면 → 신호 차원의 차이가 거리 계산 속에 묻힙니다 → 최근접 이웃이 무리를 구별하지 못합니다(논문 밖). 신호 2개 차원은 데이터 안에 그대로 남아 있습니다.
        </Text>
        <Widget name="noise" title="잡음 차원과 거리" height={520} />
        <Table
          columns={["관찰", "내용", "근거"]}
          rows={[
            ["학습은 버팀", "잠재 차원을 늘려도 과적합이 늘지 않음. 저자는 하한의 정규화 효과로 설명", "그림 2 캡션, p.7"],
            ["평가는 무너짐", "고차원에서 주변우도 추정을 믿을 수 없었음", "§5, p.7"],
          ]}
        />
        <Text>필요 없는 잠재 차원은 KL 항 때문에 사전분포와 같은 상태로 남아 디코더에 정보를 전하지 않는다고 해석합니다(추정).</Text>
      </Section>

      <Section heading="베이즈 정리" id="bayes">
        <Tex display>{"p(\\mathbf{z} \\mid \\mathbf{x}) = \\frac{p(\\mathbf{x} \\mid \\mathbf{z})\\, p(\\mathbf{z})}{p(\\mathbf{x})}"}</Tex>
        <Table
          columns={["부분", "이름", "묻는 것"]}
          align={["start", "start", "start"]}
          rows={[
            ["p(z|x)", "사후분포", "사진을 본 뒤, 스케치가 z였을 확률"],
            ["p(x|z)", "우도", "스케치가 z일 때, 이 사진이 나올 확률"],
            ["p(z)", "사전분포", "사진을 보기 전, 스케치가 z일 확률"],
            ["p(x)", "주변우도", "어떤 스케치든 상관없이, 이 사진이 나올 확률"],
          ]}
        />
        <Text>
          세로 막대 |는 시간 순서가 아니라 "~인 것들 중에서"라는 뜻입니다. 결합확률 p(x, z)를 두 길로 세면 같은 값이 나오고, 그 등식을 p(x)로 나누면 베이즈 정리가 됩니다. 세계의 인과 방향(스케치 → 사진)은 바뀌지 않습니다.
        </Text>
        <Widget name="routes" title="같은 칸 두 길" height={600} />
        <Text>
          넓이 그림으로도 확인해 보십시오. 두 우도를 같게 맞추면 → 사진 x는 어느 스케치였는지 단서가 되지 못합니다 → "스케치가 A일 확률"의 사후 p(A|x)가 사전 p(A)와 같아집니다.
        </Text>
        <Widget name="bayesarea" title="베이즈 넓이 그림" height={560} />
        <Text>
          분자 p(x|z)p(z)는 디코더와 사전분포로 바로 계산됩니다. 분모 p(x)는 모든 스케치를 더해야 해서 막힙니다. 그래서 저자는 p(z|x)를 인코더 q(z|x)로 근사합니다(§2.1, p.3).
        </Text>
      </Section>

      <Section heading="경사상승법과 경사하강법" id="ascent">
        <Text>
          선택 기준은 그래프 모양이나 부호가 아니라 목표입니다. 크게 만들 값이면 경사상승법, 작게 만들 값이면 경사하강법입니다. g = −f로 두면 두 갱신이 매 걸음 똑같은 θ를 만듭니다.
        </Text>
        <Tex display>{"\\theta - \\eta \\nabla(-f) = \\theta + \\eta \\nabla f"}</Tex>
        <Widget name="ascent" title="경사상승과 경사하강" height={720} />
        <Table
          columns={["경우", "예 (계산으로 확인)", "결과"]}
          rows={[
            ["상한 있음, 봉우리 있음", "−(x − 2)², η = 0.25", { text: "x = 2로 수렴", tone: "success" }],
            ["상한 있음, 봉우리 없음", "−e^(−x)", { text: "값은 0에 다가가지만 x는 끝없이 커짐", tone: "warning" }],
            ["상한 없음, 봉우리 있음", "x³ − 3x", { text: "x = −1 근처에서 출발하면 수렴", tone: "success" }],
            ["상한 있음, 학습률 과대", "−(x − 2)², η = 1.5", { text: "0 → 6 → −6 → 18, 발산", tone: "danger" }],
          ]}
        />
        <Callout lead="상한이 보장하는 것">
          상한이 있으면 → 값이 그 선에서 막힙니다 → 값이 무한히 커지지 않습니다. 수렴은 봉우리, 출발점, 학습률에 함께 달려 있습니다.
        </Callout>
        <Table
          columns={["분야", "원래 목표", "실제 구현 (논문 밖, 관행)"]}
          rows={[
            ["분류", "정답 확률을 크게", "교차 엔트로피 손실 최소화"],
            ["VAE", "하한(ELBO)을 크게 (§5, p.7)", "−ELBO 최소화"],
            ["강화학습", "기대 보상을 크게", "−보상 최소화"],
          ]}
        />
      </Section>

      <Section heading="하한 L과 논문의 연결" id="elbo">
        <Tex display>{"\\log p(\\mathbf{x}) = D_{KL}\\big(q(\\mathbf{z}\\mid\\mathbf{x}) \\,\\|\\, p(\\mathbf{z}\\mid\\mathbf{x})\\big) + \\mathcal{L}"}</Tex>
        <Text>
          KL은 인코더와 참 사후분포의 차이이고 0 이상입니다 → L은 log p(x)보다 클 수 없습니다(식 1·2, §2.2, p.3). 두 분포가 같으면 KL = 0이고 L = log p(x)입니다(부록 F, p.12).
        </Text>
        <Widget name="elboline" title="하한 L의 위치" height={260} />
        <Steps
          steps={[
            { title: "L ≤ log p(x) ≤ 0", detail: "MNIST(베르누이 디코더)는 확률이 1 이하라서 log p(x)가 0 이하입니다(도출)." },
            { title: "경사상승법이 L을 밀어 올림", detail: "L은 0이라는 선에 막혀 무한히 커지지 않습니다." },
            { title: "실제로는 0보다 아래에서 멈춤", detail: "서로 다른 사진에 동시에 확률 1을 줄 수 없기 때문입니다(도출)." },
          ]}
        />
        <Table
          columns={["논문 위치", "이어지는 내용"]}
          rows={[
            ["식 1~3 (§2.2, p.3)", "하한의 정의. 학습 목표가 log p(x)에서 L로 바뀌는 출발점"],
            ["알고리즘 1 (§2.3, p.4)", "미니배치로 L의 기울기를 구해 θ와 φ를 갱신"],
            ["그림 2 (p.7)", "세로축이 데이터당 평균 L. MNIST는 음수, Frey Face(가우시안)는 양수 눈금"],
            ["그림 3 (p.8)", "L이 아니라 log p(x) 자체를 MCMC로 따로 추정해 비교"],
          ]}
        />
        <Text>
          L을 키우면 디코더가 사진을 잘 만들게 되고(log p(x)를 올림), 인코더가 참 사후분포를 잘 흉내 내게 됩니다(KL을 줄임)(해석, 추정). 다음에 볼 곳은 L을 "재구성 점수 − KL 벌점"으로 다시 쓴 식 3입니다.
        </Text>
      </Section>

      <Section heading="KL 발산" id="kl">
        <Text>
          KL 발산(KL divergence)은 분포 q를 쓸 때, 진짜 분포 p와 비교해 평균적으로 얼마나 어긋나는지를 재는 값입니다. VAE에서는 인코더 q(z|x)가 참 사후분포를 얼마나 잘 흉내 내는지 재는 도구로 쓰입니다(§2.1·2.2, p.3).
        </Text>
        <Tex display>{"D_{KL}(q \\,\\|\\, p) = \\sum_{z} q(z) \\log \\frac{q(z)}{p(z)}"}</Tex>
        <Text>
          읽는 법은 "q의 확률로 가중한 log(q/p)의 평균"입니다. log(q/p)는 한 값에서 q가 p보다 확률을 몇 배 크게 주는지를 로그로 잰 값입니다. q가 자주 내놓는 값일수록 그 차이를 무겁게 셉니다. z가 연속이면 합 대신 적분을 씁니다.
        </Text>
        <Table
          columns={["스케치", "q (인코더 추측)", "p (참 사후분포)", "q × log(q/p)"]}
          rows={[
            ["A", "0.9", "0.368", "0.9 × log(2.446) = 0.805"],
            ["B", "0.1", "0.632", "0.1 × log(0.158) = −0.184"],
            ["합 = KL(q‖p)", "", "", "0.621"],
          ]}
        />
        <Text>앞 절의 스케치 A·B 예입니다(예시 값, 자연로그, 계산으로 확인). 한 칸이 음수여도 합은 0 이상입니다.</Text>
        <Table
          columns={["성질", "내용", "위 예에서"]}
          rows={[
            ["0 이상", "항상 KL ≥ 0입니다. 깁스 부등식(Gibbs' inequality)이라는 정리입니다(논문 밖).", "0.621 ≥ 0"],
            ["같으면 0", "q와 p가 모든 값에서 같으면 KL = 0입니다.", "q = (0.368, 0.632)이면 0"],
            ["비대칭", "KL(q‖p)와 KL(p‖q)는 보통 다릅니다. 가중치로 쓰는 분포가 다르기 때문입니다.", "0.621 대 0.836"],
          ]}
        />
        <Text>두 분포를 바꿔 보십시오. 슬라이더 단위 때문에 p(A)의 기본값은 0.37이라서, 표와 소수 셋째 자리가 조금 다를 수 있습니다.</Text>
        <Widget name="kl" title="KL 발산 탐색" height={520} />
        <Table
          columns={["위치", "두 분포", "역할"]}
          rows={[
            ["식 1 (§2.2, p.3)", "인코더 대 참 사후분포", "L과 log p(x) 사이의 간격. 참 사후분포가 들어 있어서 직접 계산할 수 없음"],
            ["식 3 (§2.2, p.3)", "인코더 대 사전분포 N(0, I)", "하한 안의 벌점. 인코더를 사전분포 쪽으로 당기는 정규화 항(§2.3, p.4)"],
          ]}
        />
        <Text>
          식 3의 KL은 두 분포가 모두 가우시안이라서 적분 없이 식 하나로 계산됩니다(부록 B, p.10-11). μ와 σ는 인코더가 차원 j마다 낸 평균과 흩어짐입니다.
        </Text>
        <Tex display>{"-D_{KL} = \\frac{1}{2} \\sum_{j=1}^{J} \\left( 1 + \\log \\sigma_j^2 - \\mu_j^2 - \\sigma_j^2 \\right)"}</Tex>
        <Steps
          steps={[
            { title: "μ = 0, σ = 1이면 KL = 0", detail: "괄호 안이 1 + 0 − 0 − 1 = 0입니다. 인코더가 사전분포 N(0, 1)과 같아진 경우입니다." },
            { title: "μ = 1, σ = 0.5이면 KL ≈ 0.818", detail: "한 차원 예시 값, 계산으로 확인. 평균이 0에서 멀고 흩어짐이 1보다 작을수록 벌점이 커집니다." },
          ]}
        />
        <Callout lead="정리" tone="info">
          계산할 수 없는 KL(식 1)은 하한의 간격이 되고, 계산할 수 있는 KL(식 3)은 인코더를 사전분포 쪽으로 당기는 벌점이 됩니다.
        </Callout>
      </Section>

      <Section heading="한눈에 보기" id="map">
        <Text>지금까지의 내용을 가로 마인드맵으로 정리했습니다. 가지를 눌러 접고 펼칠 수 있습니다.</Text>
        <Widget name="mindmap" title="AEVB 학습 노트 마인드맵" height={720} />
        <Callout lead="한 줄 흐름" tone="info">
          사후분포의 분모 p(x)가 계산 불가합니다 → 그래서 log p(x) 대신 그 아래에 있는 하한 L을 키웁니다 → L의 기울기를 구하려고 노이즈를 밖으로 빼는 재매개변수화를 씁니다 → 인코더가 사진마다 한 번에 분포를 내므로, 데이터마다 MCMC를 돌리지 않고 미니배치로 학습합니다.
        </Callout>
      </Section>

      <Section heading="공부하며 바로잡은 내용" id="fixes">
        <Table
          columns={["처음 표현 또는 이해", "바로잡은 내용"]}
          rows={[
            ["상한이 없으면 발산한다", "상한은 값이 무한히 커지는 것만 막습니다. 상한이 없어도 봉우리에서 멈출 수 있습니다."],
            ["베이즈 정리의 두 순서는 시간 순서가 다르다", "|는 \"~인 것들 중에서\"입니다. 두 순서는 같은 칸을 세는 두 길입니다."],
            ["차원을 늘리면 정보가 의미 없어진다", "정보는 남습니다. 잡음 차원이 신호를 거리 계산 속에 묻을 뿐입니다."],
            ["사후가 사전과 같아진다 (대상이 빠짐)", "\"스케치가 A일 확률\"의 사전 p(A)와 사후 p(A|x)가 같아진다는 뜻입니다."],
            ["MNIST L이 도달하는 최댓값은 0", "0은 넘을 수 없는 선이지, 실제로 도달하는 값이 아닙니다."],
          ]}
        />
      </Section>

      <Section heading="출처" id="refs">
        <Text>
          Diederik P. Kingma, Max Welling. Auto-Encoding Variational Bayes. 2013. arXiv:1312.6114 (v11, 2022). https://arxiv.org/abs/1312.6114
        </Text>
        <Text>쪽 번호와 절 번호는 arXiv v11 기준입니다. 위젯의 분포와 숫자는 설명을 위해 만든 예시이며 논문의 실험값이 아닙니다. 위젯은 Claude 앱에서 공부하며 만든 그림을 그대로 옮겼습니다.</Text>
      </Section>
    </Page>
  );
}

export type AnswerType =
  | 'single_choice'
  | 'multiple_choice'
  | 'short_text'
  | 'long_text'
  | 'date'
  | 'year_month'
  | 'rating';

export type ReviewStatus = 'unreviewed' | 'reviewed' | 'needs_revision';
export type SectionKind = 'era' | 'theme' | 'personality';

export type Question = {
  id: string;
  text: string;
  helpText: string;
  answerType: AnswerType;
  required: boolean;
  order: number;
  tags: string[];
  enabled: boolean;
  source: 'ai' | 'manual';
  reviewStatus: ReviewStatus;
  options?: string[];
  intent?: string;
  aiOriginalText?: string;
  reviewMemo?: string;
};

export type Section = {
  id: string;
  title: string;
  description: string;
  kind: SectionKind;
  order: number;
  enabled: boolean;
  questions: Question[];
};

export type QuestionSet = {
  schemaVersion: number;
  questionSetId: string;
  version: string;
  title: string;
  updatedAt: string;
  sections: Section[];
};

type InitialQuestionInput = Pick<
  Question,
  'id' | 'text' | 'helpText' | 'answerType' | 'order' | 'tags' | 'intent'
> & Partial<Pick<Question, 'required' | 'options' | 'source' | 'reviewStatus' | 'reviewMemo'>>;

function initialQuestion({
  required = false,
  source = 'ai',
  reviewStatus,
  ...input
}: InitialQuestionInput): Question {
  return {
    ...input,
    required,
    enabled: true,
    source,
    reviewStatus: reviewStatus ?? (source === 'manual' ? 'reviewed' : 'unreviewed'),
    aiOriginalText: source === 'ai' ? input.text : undefined,
  };
}

export const initialQuestionSet: QuestionSet = {
  schemaVersion: 1,
  questionSetId: 'standard-life-story',
  version: '2.0.0',
  title: '人生史 インタビュー基本設問',
  updatedAt: '2026-08-31T12:00:00.000Z',
  sections: [
    {
      id: 'profile',
      title: '基本情報',
      description: '人生史に掲載する氏名や、生年月日などの基礎情報を確認します。',
      kind: 'theme',
      order: 10,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'profile-name',
          text: '人生史に掲載するお名前を入力してください。',
          helpText: '旧姓、ふりがな、通称も残したい場合は、あわせて入力してください。',
          answerType: 'short_text',
          required: true,
          order: 10,
          tags: ['基本情報', '氏名'],
          source: 'manual',
          intent: '人生史に掲載する氏名を正確に確認する',
        }),
        initialQuestion({
          id: 'profile-birth-date',
          text: '生年月日を入力してください。',
          helpText: '年月日で入力してください。公開したくない場合は空欄でも構いません。',
          answerType: 'date',
          order: 20,
          tags: ['基本情報', '生年月日'],
          source: 'manual',
          intent: '人生の出来事を年代順に整理する基準を確認する',
        }),
        initialQuestion({
          id: 'profile-birth-place',
          text: '生まれた場所を入力してください。',
          helpText: '都道府県・市区町村、または国・地域など、残したい範囲で入力してください。',
          answerType: 'short_text',
          order: 30,
          tags: ['基本情報', '場所'],
          source: 'manual',
          intent: '人生史の始まりとなる場所を確認する',
        }),
        initialQuestion({
          id: 'profile-other-names',
          text: '家族や友人から、どのような名前や愛称で呼ばれてきましたか？',
          helpText: '誰が、どの時期に、どのように呼んでいたかも教えてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['人柄', '人間関係'],
          intent: '呼び名から人間関係と親しまれ方を知る',
        }),
        initialQuestion({
          id: 'profile-life-overview',
          text: 'ご自身のこれまでの人生を、短い言葉で表すとしたら何ですか？',
          helpText: '今の時点で思いつく言葉で構いません。理由や思いもあわせてお聞かせください。',
          answerType: 'long_text',
          order: 50,
          tags: ['人生観', '導入'],
          intent: '本人が捉えている人生全体のテーマを知る',
        }),
      ],
    },
    {
      id: 'roots-childhood',
      title: '原風景・幼少期',
      description: '育った環境、身近な人、幼いころの行動から、その人らしさの原点を探ります。',
      kind: 'era',
      order: 20,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'childhood-home',
          text: '子どものころ、どのような場所や家で暮らしていましたか？',
          helpText: '風景、音、匂い、季節、家の中の様子など、覚えている場面からお話しください。',
          answerType: 'long_text',
          order: 10,
          tags: ['幼少期', '原風景'],
          intent: '人生史の舞台となる幼少期の情景を具体的に描く',
        }),
        initialQuestion({
          id: 'childhood-household',
          text: '当時は誰と暮らし、家庭にはどのような雰囲気がありましたか？',
          helpText: '家族それぞれの役割や、日常の会話、よくあった出来事などからお話しください。',
          answerType: 'long_text',
          order: 20,
          tags: ['幼少期', '家族'],
          intent: '家庭環境と人との関わり方の原点を知る',
        }),
        initialQuestion({
          id: 'childhood-earliest-scene',
          text: '幼いころの記憶で、今も鮮明に浮かぶ場面を一つ教えてください。',
          helpText: 'いつ、どこで、誰と、何が起こり、そのときどう感じたかをお聞かせください。',
          answerType: 'long_text',
          order: 30,
          tags: ['幼少期', '思い出', '感情'],
          intent: '本人にとって意味のある最初期の記憶を引き出す',
        }),
        initialQuestion({
          id: 'childhood-play',
          text: '子どものころ、何に夢中になっていましたか？',
          helpText: '遊びや習い事、集めていた物、一緒にいた人、自分なりの工夫も教えてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['幼少期', '好奇心', '行動'],
          intent: '好奇心や行動の特徴を具体的な体験から知る',
        }),
        initialQuestion({
          id: 'childhood-traits-episode',
          text: '周りからどのような子どもだと言われていましたか？',
          helpText: 'そう言われるようになった出来事や、今のご自身との共通点もお聞かせください。',
          answerType: 'long_text',
          order: 50,
          tags: ['幼少期', '人柄'],
          intent: '幼少期の人物像を評価とエピソードの両面から知る',
        }),
        initialQuestion({
          id: 'childhood-influence',
          text: '幼いころの考え方に影響を与えた人や出来事はありますか？',
          helpText: 'その人の言葉や出来事の内容と、今も残っている影響を教えてください。',
          answerType: 'long_text',
          order: 60,
          tags: ['幼少期', '影響', '価値観'],
          intent: '価値観の形成につながった原体験を知る',
        }),
      ],
    },
    {
      id: 'school',
      title: '学校・学び',
      description: '学校名と在籍時期を記録し、学びや友人関係から成長の過程をたどります。',
      kind: 'era',
      order: 30,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'school-elementary-name',
          text: '通った小学校の正式名称と在籍時期を入力してください。',
          helpText: '転校した場合は、学校ごとに所在地とおおよその在籍期間も入力してください。',
          answerType: 'long_text',
          order: 10,
          tags: ['学校', '固有名詞', '経歴'],
          source: 'manual',
          intent: '小学校名を固有名詞で正確に記録する',
        }),
        initialQuestion({
          id: 'school-junior-high-name',
          text: '通った中学校の正式名称と在籍時期を入力してください。',
          helpText: '転校した場合は、学校ごとに所在地とおおよその在籍期間も入力してください。',
          answerType: 'long_text',
          order: 20,
          tags: ['学校', '固有名詞', '経歴'],
          source: 'manual',
          intent: '中学校名を固有名詞で正確に記録する',
        }),
        initialQuestion({
          id: 'school-high-name',
          text: '通った高校・高等専門学校などの正式名称と在籍時期を入力してください。',
          helpText: '学科、コース、所在地も残したい範囲で入力してください。',
          answerType: 'long_text',
          order: 30,
          tags: ['学校', '固有名詞', '経歴'],
          source: 'manual',
          intent: '高校等の名称を固有名詞で正確に記録する',
        }),
        initialQuestion({
          id: 'school-higher-education-names',
          text: '大学・短大・専門学校・職業訓練などの正式名称と在籍時期を入力してください。',
          helpText: '学部、学科、専攻、研究室、取得した資格なども入力できます。該当しなければ空欄で構いません。',
          answerType: 'long_text',
          order: 40,
          tags: ['学校', '固有名詞', '経歴'],
          source: 'manual',
          intent: '高等教育や職業訓練の履歴を固有名詞で正確に記録する',
        }),
        initialQuestion({
          id: 'school-defining-story',
          text: '学生時代のご自身らしさが伝わる出来事を一つ教えてください。',
          helpText: 'いつ、どこで、誰と何をし、どのような考えで行動したかをお聞かせください。',
          answerType: 'long_text',
          order: 50,
          tags: ['学校', '人柄', 'エピソード'],
          intent: '学生時代の人物像を具体的な行動から描く',
        }),
        initialQuestion({
          id: 'school-important-person',
          text: '学校生活で大きな影響を受けた先生、友人、先輩などは誰ですか？',
          helpText: '差し支えない範囲で名前や所属、印象に残る言葉、その後への影響を教えてください。',
          answerType: 'long_text',
          order: 60,
          tags: ['学校', '人間関係', '影響'],
          intent: '成長に影響した人物と、その関係の意味を知る',
        }),
        initialQuestion({
          id: 'school-choice-growth',
          text: '進学や学びに関して、大きな選択をした経験を教えてください。',
          helpText: '迷ったこと、選んだ理由、その結果得たことや変わったことをお聞かせください。',
          answerType: 'long_text',
          order: 70,
          tags: ['学校', '選択', '成長'],
          intent: '選択の背景から意思決定と成長の過程を知る',
        }),
      ],
    },
    {
      id: 'career',
      title: '仕事・社会での役割',
      description: '会社・組織名と役割を記録し、仕事を通じて表れた人柄や価値観を探ります。',
      kind: 'era',
      order: 40,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'career-organizations',
          text: '勤めた会社・組織・店舗・事業の正式名称と在籍時期を入力してください。',
          helpText: '部署、役職、担当した仕事、所在地も、組織ごとに入力してください。',
          answerType: 'long_text',
          order: 10,
          tags: ['仕事', '固有名詞', '経歴'],
          source: 'manual',
          intent: '職歴を組織名・役割・時期とともに正確に記録する',
        }),
        initialQuestion({
          id: 'career-first-choice',
          text: '最初の仕事や社会での役割を、どのように選びましたか？',
          helpText: '会社や組織の名前、当時の状況、迷い、決め手、働き始めたときの気持ちを教えてください。',
          answerType: 'long_text',
          order: 20,
          tags: ['仕事', '選択', '出発点'],
          intent: '職業人生の出発点と意思決定の背景を知る',
        }),
        initialQuestion({
          id: 'career-defining-work',
          text: 'ご自身らしさが最も表れた仕事や役割を一つ教えてください。',
          helpText: '課題、工夫、関わった人、結果、そこに表れたご自身の強みをお聞かせください。',
          answerType: 'long_text',
          order: 30,
          tags: ['仕事', '人柄', '強み'],
          intent: '仕事上の行動から人物像と強みを具体的に描く',
        }),
        initialQuestion({
          id: 'career-setback',
          text: '仕事や社会での役割の中で、思いどおりにならなかった経験はありますか？',
          helpText: '何が起こり、どう行動し、誰に支えられ、考え方がどう変わったかを教えてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['仕事', '試練', '成長'],
          intent: '困難への向き合い方と成長の過程を知る',
        }),
        initialQuestion({
          id: 'career-important-person',
          text: '仕事を通じて大きな影響を受けた人は誰ですか？',
          helpText: '上司、同僚、部下、取引先などの名前や所属、印象的な出来事、その後への影響を教えてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['仕事', '人間関係', '影響'],
          intent: '職業人生を形づくった関係と学びを知る',
        }),
        initialQuestion({
          id: 'career-values',
          text: '仕事や役割を果たすうえで、譲らなかったことは何ですか？',
          helpText: 'その考えが表れた出来事と、周囲にどのような影響があったかをお聞かせください。',
          answerType: 'long_text',
          order: 60,
          tags: ['仕事', '価値観'],
          intent: '仕事観の核となる価値と行動原則を知る',
        }),
        initialQuestion({
          id: 'career-unpaid-roles',
          text: '仕事以外で、長く担ってきた大切な役割はありますか？',
          helpText: '家事、子育て、介護、地域活動、創作、ボランティアなどでの役割と工夫を教えてください。',
          answerType: 'long_text',
          order: 70,
          tags: ['役割', '暮らし', '社会'],
          intent: '職歴だけでは見えない貢献や責任を人生史に含める',
        }),
      ],
    },
    {
      id: 'relationships',
      title: '家族・人とのつながり',
      description: '大切な人との出会い、支え合い、日々の習慣から関係の物語を集めます。',
      kind: 'theme',
      order: 50,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'relationships-important',
          text: 'これまでの人生で、特に大切な人との出会いを教えてください。',
          helpText: '差し支えない範囲で名前、出会った時期と場所、関係を象徴する出来事をお聞かせください。',
          answerType: 'long_text',
          order: 10,
          tags: ['人間関係', '出会い'],
          intent: '人生に重要な影響を与えた関係の始まりと意味を知る',
        }),
        initialQuestion({
          id: 'relationships-family-milestone',
          text: '家族や暮らしに関する大きな節目を一つ教えてください。',
          helpText: '結婚、誕生、同居、独立、再会など、出来事の前後で何が変わったかをお聞かせください。',
          answerType: 'long_text',
          order: 20,
          tags: ['家族', '節目', '暮らし'],
          intent: '生活と関係性が変化した重要な節目を知る',
        }),
        initialQuestion({
          id: 'relationships-support',
          text: 'つらいときや迷ったとき、誰がどのように支えてくれましたか？',
          helpText: 'その人の言葉や行動と、それを受けてご自身がどう変わったかを教えてください。',
          answerType: 'long_text',
          order: 30,
          tags: ['人間関係', '支え', '感謝'],
          intent: '支えとなった関係と本人の受け止め方を知る',
        }),
        initialQuestion({
          id: 'relationships-tradition',
          text: '家族や身近な人と大切にしてきた習慣や行事はありますか？',
          helpText: 'いつ、誰と、何をするのか、その習慣がご自身にとって持つ意味をお聞かせください。',
          answerType: 'long_text',
          order: 40,
          tags: ['家族', '習慣', '暮らし'],
          intent: '日常の積み重ねから家族らしさと価値観を描く',
        }),
        initialQuestion({
          id: 'relationships-community',
          text: '心の居場所になった地域、団体、仲間の集まりはありますか？',
          helpText: '場所や団体の名前、参加したきっかけ、ご自身の役割、心に残る出来事を教えてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['地域', 'コミュニティ', '居場所'],
          intent: '社会とのつながりと、その中で果たした役割を知る',
        }),
      ],
    },
    {
      id: 'turning-points',
      title: '転機・試練',
      description: '人生の方向が変わった出来事と、そこに表れた判断や回復の力をたどります。',
      kind: 'theme',
      order: 60,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'turning-points-three',
          text: '人生の方向を変えた出来事を、三つまで挙げてください。',
          helpText: 'それぞれ、いつ、どこで、誰と、何が起きたかを短く整理してください。',
          answerType: 'long_text',
          order: 10,
          tags: ['転機', '年表'],
          intent: '人生史の中心となる出来事の候補を見つける',
        }),
        initialQuestion({
          id: 'turning-decision',
          text: '大きな決断をしたとき、何に迷い、最後は何が決め手になりましたか？',
          helpText: '選ばなかった道、相談した人、決断後に起きたこともお聞かせください。',
          answerType: 'long_text',
          order: 20,
          tags: ['転機', '決断', '価値観'],
          intent: '重要な場面での判断基準と人柄を知る',
        }),
        initialQuestion({
          id: 'turning-hardship',
          text: 'これまでで特に難しかった時期を、どのように乗り越えましたか？',
          helpText: '当時の気持ち、支えになった人や考え、実際に取った行動、今感じる意味を教えてください。',
          answerType: 'long_text',
          order: 30,
          tags: ['試練', '回復', '成長'],
          intent: '逆境への向き合い方と人生の重要な物語を知る',
        }),
        initialQuestion({
          id: 'turning-coincidence',
          text: '偶然の出会いや出来事が、その後の人生を変えたことはありますか？',
          helpText: '偶然をどのように受け止め、どんな行動につなげたかをお聞かせください。',
          answerType: 'long_text',
          order: 40,
          tags: ['転機', '出会い', '行動'],
          intent: '偶然を転機に変えた本人の選択と行動を知る',
        }),
        initialQuestion({
          id: 'turning-reframed-regret',
          text: '当時は後悔したものの、今は違う意味を感じる出来事はありますか？',
          helpText: '見方が変わったきっかけと、その経験が今にどう生きているかを教えてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['転機', '後悔', '意味づけ'],
          intent: '経験の意味を捉え直した過程と成熟を知る',
        }),
      ],
    },
    {
      id: 'personality-values',
      title: '人柄・価値観',
      description: '具体的な行動や選択を通して、その人らしさと一貫した価値観を言葉にします。',
      kind: 'personality',
      order: 70,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'personality-others-story',
          text: '親しい人は、ご自身をどのような人だと紹介すると思いますか？',
          helpText: 'そう思う理由が伝わる出来事を一つ添えてください。',
          answerType: 'long_text',
          order: 10,
          tags: ['人柄', '他者からの視点'],
          intent: '他者の視点と実例から人物像を立体的に描く',
        }),
        initialQuestion({
          id: 'personality-decision-pattern',
          text: '何かを決めて動くとき、ご自身にはどのような傾向がありますか？',
          helpText: '最近または印象に残る決断を例に、考えた順序や周囲との関わりを教えてください。',
          answerType: 'long_text',
          order: 20,
          tags: ['人柄', '意思決定', '行動'],
          intent: '抽象的な自己評価を具体的な意思決定の実例で確かめる',
        }),
        initialQuestion({
          id: 'personality-joy',
          text: 'どのようなときに、最も自分らしいと感じますか？',
          helpText: '何をして、誰といて、どのような気持ちになるのかをお聞かせください。',
          answerType: 'long_text',
          order: 30,
          tags: ['人柄', '喜び', '日常'],
          intent: '本人らしさが自然に表れる時間と条件を知る',
        }),
        initialQuestion({
          id: 'personality-core-values',
          text: '人生を通して変わらず大切にしてきたことは何ですか？',
          helpText: 'その価値観が試された出来事や、守るために取った行動も教えてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['価値観', '一貫性'],
          intent: '人生全体を貫く価値観と、その実践を知る',
        }),
        initialQuestion({
          id: 'personality-change',
          text: '昔と比べて変わった考え方と、変わらない考え方を教えてください。',
          helpText: '変化のきっかけとなった人や出来事と、今の行動への影響をお聞かせください。',
          answerType: 'long_text',
          order: 50,
          tags: ['価値観', '変化', '成長'],
          intent: '人生を通じた変化と一貫性の両方を描く',
        }),
      ],
    },
    {
      id: 'legacy-future',
      title: '誇り・未来へ残すこと',
      description: '人生を振り返り、誇り、受け継いでほしいこと、未来への言葉を集めます。',
      kind: 'theme',
      order: 80,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'legacy-proud',
          text: 'これまでの人生で、ご自身が最も誇りに思うことは何ですか？',
          helpText: '結果だけでなく、そこに至るまでの選択、努力、支えてくれた人も教えてください。',
          answerType: 'long_text',
          order: 10,
          tags: ['誇り', '達成', '感謝'],
          intent: '本人が人生で最も価値を置く達成と背景を知る',
        }),
        initialQuestion({
          id: 'legacy-contribution',
          text: '人や社会に、どのようなものを手渡してこられたと思いますか？',
          helpText: '仕事、家庭、地域、知識、習慣、思いやりなど、具体的な相手や出来事からお話しください。',
          answerType: 'long_text',
          order: 20,
          tags: ['貢献', 'つながり'],
          intent: '本人の貢献と周囲に残した影響を知る',
        }),
        initialQuestion({
          id: 'legacy-younger-self',
          text: '若いころのご自身に、今ならどのような言葉をかけますか？',
          helpText: 'その言葉を選ぶ理由となった経験もお聞かせください。',
          answerType: 'long_text',
          order: 30,
          tags: ['人生観', '振り返り'],
          intent: '経験から得た知恵と自己理解を言葉にする',
        }),
        initialQuestion({
          id: 'legacy-preserve',
          text: '次の世代に残したい思い出、知恵、習慣は何ですか？',
          helpText: '誰に、何を、なぜ残したいのか、それを表す出来事とともに教えてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['継承', '未来', '価値観'],
          intent: '人生史で後世へ伝える中心メッセージを見つける',
        }),
        initialQuestion({
          id: 'legacy-message',
          text: '人生史を読む大切な人へ、最後に伝えたいことは何ですか？',
          helpText: '感謝、願い、励まし、これからしたいことなど、自由にお書きください。',
          answerType: 'long_text',
          order: 50,
          tags: ['メッセージ', '未来'],
          intent: '人生史の結びとなる本人の言葉を残す',
        }),
      ],
    },
  ],
};

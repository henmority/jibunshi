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
  version: '4.0.0',
  title: '人生史 インタビュー基本設問',
  updatedAt: '2026-09-11T00:00:00.000Z',
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
          text: '子どものころ、家族や友人から何と呼ばれていましたか？',
          helpText: '呼び名を一つ挙げ、誰がそう呼んでいたか、呼ばれたときの気持ちを教えてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['人柄', '人間関係'],
          intent: '具体的な呼び名と呼び手から、幼少期の人間関係を知る',
        }),
        initialQuestion({
          id: 'profile-life-overview',
          text: 'これまでに長く暮らした場所を、古い順に入力してください。',
          helpText: '例：1970年ごろ〜1985年／〇〇県〇〇市。引っ越した理由は、一言で添えれば十分です。',
          answerType: 'long_text',
          order: 50,
          tags: ['場所', '年表', '移動'],
          intent: '暮らした場所と時期から、人生の舞台と移動の流れを整理する',
        }),
      ],
    },
    {
      id: 'roots-childhood',
      title: '原風景・幼少期',
      description: '家、近所、日常の会話など、目に浮かぶ一場面から幼少期をたどります。',
      kind: 'era',
      order: 20,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'childhood-home',
          text: '小学校に入る前ごろ、よく目にしていた家や近所の景色を一つ教えてください。',
          helpText: '窓から見えたもの、道、店、田畑、音や匂いなど、最初に浮かぶものだけで構いません。',
          answerType: 'long_text',
          order: 10,
          tags: ['幼少期', '原風景'],
          intent: '視覚や感覚で思い出せる一場面から、幼少期の舞台を描く',
        }),
        initialQuestion({
          id: 'childhood-household',
          text: '小学生のころ、一緒に暮らしていた人を教えてください。',
          helpText: 'ご自身との関係と、覚えていれば名前や普段していたことを書いてください。',
          answerType: 'long_text',
          order: 20,
          tags: ['幼少期', '家族'],
          intent: '幼少期の同居者を事実として整理し、家庭の人物関係を明確にする',
        }),
        initialQuestion({
          id: 'childhood-earliest-scene',
          text: 'ご自身のいちばん古い記憶として、どんな場面が浮かびますか？',
          helpText: '場所、そばにいた人、起きたことを、思い出せる範囲で書いてください。はっきりしなければ空欄でも構いません。',
          answerType: 'long_text',
          order: 30,
          tags: ['幼少期', '思い出', '感情'],
          intent: '意味づけを求めず、本人が実際に思い出せる最初期の場面を記録する',
        }),
        initialQuestion({
          id: 'childhood-play',
          text: '放課後や休日によくしていた遊びを一つ教えてください。',
          helpText: 'どこで、誰と、どんな順番やルールで遊んだかを、ある一日のように書いてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['幼少期', '好奇心', '行動'],
          intent: '繰り返した遊びの具体的な行動から、興味と人との関わり方を知る',
        }),
        initialQuestion({
          id: 'childhood-traits-episode',
          text: '子どものころ、褒められたこと、またはよく注意されたことを一つ教えてください。',
          helpText: '誰に何と言われ、その直前にご自身が何をしていたかを書いてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['幼少期', '人柄'],
          intent: '抽象的な性格評価ではなく、周囲の反応と本人の行動から人柄を描く',
        }),
        initialQuestion({
          id: 'childhood-influence',
          text: '子どものころ、大人から言われて今も覚えている言葉はありますか？',
          helpText: '誰が、どこで、どんな場面で言ったかを書いてください。思い当たらなければ空欄で構いません。',
          answerType: 'long_text',
          order: 60,
          tags: ['幼少期', '影響', '価値観'],
          intent: '実際に記憶に残る言葉と場面から、価値観の形成過程を知る',
        }),
      ],
    },
    {
      id: 'school',
      title: '学校・学び',
      description: '学校名と在籍時期を記録し、日常、活動、会話、進路選択を具体的にたどります。',
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
          text: '学生時代、授業以外でいちばん時間を使ったことは何ですか？',
          helpText: '部活動、アルバイト、家の手伝い、通学、趣味などから一つ選び、普段何をしていたかを書いてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['学校', '人柄', 'エピソード'],
          intent: '時間の使い方と繰り返した行動から、学生時代の関心や責任を描く',
        }),
        initialQuestion({
          id: 'school-important-person',
          text: '今も名前や顔を思い出す先生・友人・先輩との出来事を一つ教えてください。',
          helpText: '差し支えない範囲で名前を挙げ、どこで何を話した、または一緒に何をしたかを書いてください。',
          answerType: 'long_text',
          order: 60,
          tags: ['学校', '人間関係', '影響'],
          intent: '影響の大きさを評価させず、記憶に残る人物との具体的な場面を集める',
        }),
        initialQuestion({
          id: 'school-choice-growth',
          text: '進路を決める前、どのような候補がありましたか？',
          helpText: '学校名や仕事名を挙げ、誰とどんな話をして、最後にどの候補を選んだかを書いてください。',
          answerType: 'long_text',
          order: 70,
          tags: ['学校', '選択', '成長'],
          intent: '実在した候補と会話から、進路選択の過程を明確にする',
        }),
      ],
    },
    {
      id: 'career',
      title: '仕事・社会での役割',
      description: '会社・組織名を記録し、初日、成功、行き詰まり、会話などの場面から仕事人生をたどります。',
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
          text: '初めて収入を得た仕事について教えてください。',
          helpText: '会社・店・依頼主の名前、仕事の見つけ方、初日にしたことを、覚えている範囲で書いてください。',
          answerType: 'long_text',
          order: 20,
          tags: ['仕事', '選択', '出発点'],
          intent: '職業人生の出発点を固有名詞と初日の行動から記録する',
        }),
        initialQuestion({
          id: 'career-defining-work',
          text: '仕事や役割で「うまくできた」「役に立てた」と感じた場面を一つ教えてください。',
          helpText: '最初に何が問題で、ご自身が何をし、最後に相手や状況がどうなったかを書いてください。',
          answerType: 'long_text',
          order: 30,
          tags: ['仕事', '人柄', '強み'],
          intent: '自己分析を求めず、問題・行動・結果から本人の強みを描く',
        }),
        initialQuestion({
          id: 'career-setback',
          text: '予定どおりに進まなかった仕事や役割を一つ教えてください。',
          helpText: '最初に起きた問題、そのとき最初に取った行動、最終的にどうなったかを書いてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['仕事', '試練', '成長'],
          intent: '失敗の評価ではなく、予定外の状況に対する実際の行動を知る',
        }),
        initialQuestion({
          id: 'career-important-person',
          text: '仕事で交わした、今も覚えている言葉ややり取りを一つ教えてください。',
          helpText: '相手の名前や所属、話した場所、相手とご自身が実際に何と言ったかを書いてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['仕事', '人間関係', '影響'],
          intent: '記憶に残る会話から、仕事上の関係と転機を描く',
        }),
        initialQuestion({
          id: 'career-values',
          text: '仕事で二つの選択肢に迷った場面を一つ教えてください。',
          helpText: '何と何で迷い、誰に相談し、最後に何を優先して決めたかを書いてください。',
          answerType: 'long_text',
          order: 60,
          tags: ['仕事', '価値観'],
          intent: '抽象的な仕事観ではなく、実際の選択から優先した価値を知る',
        }),
        initialQuestion({
          id: 'career-unpaid-roles',
          text: '仕事以外で、毎日または毎週続けていた役割はありますか？',
          helpText: '家事、子育て、介護、地域活動、創作などから一つ選び、時期と普段していたことを書いてください。',
          answerType: 'long_text',
          order: 70,
          tags: ['役割', '暮らし', '社会'],
          intent: '頻度と行動を手がかりに、職歴だけでは見えない継続的な役割を記録する',
        }),
      ],
    },
    {
      id: 'relationships',
      title: '家族・人とのつながり',
      description: '初対面、助けられた言葉、繰り返した習慣など、関係が見える場面を集めます。',
      kind: 'theme',
      order: 50,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'relationships-important',
          text: '大切な人と初めて会った日のことを一つ教えてください。',
          helpText: '差し支えない範囲で名前、時期、場所、最初に交わした言葉や第一印象を書いてください。',
          answerType: 'long_text',
          order: 10,
          tags: ['人間関係', '出会い'],
          intent: '関係の重要性を説明させる前に、出会いの場面を具体的に記録する',
        }),
        initialQuestion({
          id: 'relationships-family-milestone',
          text: '一緒に暮らす人や住まいが変わった出来事を一つ教えてください。',
          helpText: '結婚、誕生、同居、独立、再会、引っ越しなどから選び、年月と変化後の最初の一日を書いてください。',
          answerType: 'long_text',
          order: 20,
          tags: ['家族', '節目', '暮らし'],
          intent: '暮らしの構成が変わった時期と、その直後の具体的な生活を知る',
        }),
        initialQuestion({
          id: 'relationships-support',
          text: '困っていたとき、実際に助かった誰かの言葉や行動を一つ教えてください。',
          helpText: '誰が何を言った、または何をしてくれたか、その日の場面を書いてください。',
          answerType: 'long_text',
          order: 30,
          tags: ['人間関係', '支え', '感謝'],
          intent: '支援という抽象語ではなく、実際に助けとなった言葉や行動を記録する',
        }),
        initialQuestion({
          id: 'relationships-tradition',
          text: '家族や身近な人と、毎年または毎週繰り返していたことはありますか？',
          helpText: '行事、食事、外出、電話などから一つ選び、誰が何をしていたかを場面として書いてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['家族', '習慣', '暮らし'],
          intent: '繰り返した具体的な行動から、家族や身近な関係の日常を描く',
        }),
        initialQuestion({
          id: 'relationships-community',
          text: '定期的に通った場所や集まりを一つ教えてください。',
          helpText: '地域、店、団体、趣味の会などの正式名称、通い始めた時期、普段していたことを書いてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['地域', 'コミュニティ', '居場所'],
          intent: '「居場所」という感覚語を避け、通った場所と活動から社会とのつながりを知る',
        }),
      ],
    },
    {
      id: 'turning-points',
      title: '転機・試練',
      description: '生活が変わった年月を先に整理し、その中の決断や予定外の出来事を一つずつたどります。',
      kind: 'theme',
      order: 60,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'turning-points-three',
          text: '住む場所、学校、仕事、家族などが大きく変わった年月を、三つまで挙げてください。',
          helpText: '例：1998年4月／〇〇社へ入社。まずは年月と出来事だけを短く書いてください。',
          answerType: 'long_text',
          order: 10,
          tags: ['転機', '年表'],
          intent: '「人生の方向」という抽象表現を避け、生活上の変化を年月で特定する',
        }),
        initialQuestion({
          id: 'turning-decision',
          text: '上で挙げた変化のうち、ご自身で決めたことを一つ選んでください。',
          helpText: 'ほかにどんな選択肢があり、誰と話し、最後にどんな行動を取ったかを書いてください。',
          answerType: 'long_text',
          order: 20,
          tags: ['転機', '決断', '価値観'],
          intent: '直前に整理した出来事へ結び付け、実際の選択肢と行動から判断過程を知る',
        }),
        initialQuestion({
          id: 'turning-hardship',
          text: '予定していた生活を続けにくくなった時期はありますか？',
          helpText: '差し支えなければ、ある一日に起きたことと、その日を過ごす助けになった人や行動を書いてください。空欄でも構いません。',
          answerType: 'long_text',
          order: 30,
          tags: ['試練', '回復', '成長'],
          intent: '「乗り越えた」と決め付けず、難しい時期の一日と具体的な助けを記録する',
        }),
        initialQuestion({
          id: 'turning-coincidence',
          text: '予定していなかった誘いや出会いを受け入れた出来事はありますか？',
          helpText: '誰からどんな話があり、なぜ応じ、その次に何をしたかを書いてください。なければ空欄で構いません。',
          answerType: 'long_text',
          order: 40,
          tags: ['転機', '出会い', '行動'],
          intent: '「人生を変えた」と評価させず、予定外の出来事に応じた行動を知る',
        }),
        initialQuestion({
          id: 'turning-reframed-regret',
          text: '「別の選び方もあった」と今でも思う出来事はありますか？',
          helpText: '当時選んだことと、今ならどう説明するかを書いてください。答えにくければ空欄で構いません。',
          answerType: 'long_text',
          order: 50,
          tags: ['転機', '後悔', '意味づけ'],
          intent: '後悔の克服を前提にせず、当時と現在の見方を具体的に比較する',
        }),
      ],
    },
    {
      id: 'personality-values',
      title: '人柄・価値観',
      description: '性格を自己評価するのではなく、感謝された場面、予想外への反応、集中した時間から人柄を描きます。',
      kind: 'personality',
      order: 70,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'personality-natural-style',
          text: '普段のご自身に近いものを選んでください。',
          helpText: '正解はありません。場面によって違う場合は、複数選んで構いません。',
          answerType: 'multiple_choice',
          order: 10,
          tags: ['人柄', '自己認識'],
          options: ['まず行動してみる', 'よく考えてから動く', '人と相談して決める', '一人で集中して進める', '周囲の様子を見て支える', '新しい方法を試す'],
          source: 'manual',
          intent: '本人が感じる普段の行動傾向を、優劣のない選択肢で把握する',
        }),
        initialQuestion({
          id: 'personality-decision-style',
          text: '大切なことを決めるとき、近い進め方を選んでください。',
          helpText: 'よくある進め方を、二つまで選んでください。',
          answerType: 'multiple_choice',
          order: 20,
          tags: ['考え方', '意思決定'],
          options: ['事実や情報を集める', '自分の直感を確かめる', '信頼する人に相談する', 'まず小さく試してみる', '時間を置いて考える', '相手への影響を優先する'],
          source: 'manual',
          intent: '大切な判断における情報、直感、他者、試行の比重を知る',
        }),
        initialQuestion({
          id: 'personality-relationship-style',
          text: '人と関わるとき、ご自身に近いものを選んでください。',
          helpText: '家族、友人、仕事相手などを思い浮かべてください。',
          answerType: 'multiple_choice',
          order: 30,
          tags: ['人柄', '人間関係'],
          options: ['話を聞くことが多い', '自分から声をかける', '必要なときに支える', '役割を決めて進める', '場を和ませる', '少人数と深く付き合う'],
          source: 'manual',
          intent: '対人場面で自然に担う役割を知る',
        }),
        initialQuestion({
          id: 'personality-important-values',
          text: 'これまでの人生で大切にしてきたものを選んでください。',
          helpText: '特に近いものを三つまで選んでください。',
          answerType: 'multiple_choice',
          order: 40,
          tags: ['価値観'],
          options: ['家族とのつながり', '誠実であること', '挑戦すること', '安定した暮らし', '人の役に立つこと', '自由であること', '学び続けること', '仕事への責任', '楽しむこと'],
          source: 'manual',
          intent: '人生史の語り口と章の重点に反映する価値観を知る',
        }),
        initialQuestion({
          id: 'personality-others-story',
          text: '誰かから「助かった」「ありがとう」と言われた場面を一つ教えてください。',
          helpText: '誰に対して何をし、その人が実際に何と言ったかを書いてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['人柄', '他者からの視点'],
          intent: '他者の気持ちを推測させず、実際に受けた言葉と行動から人柄を描く',
        }),
        initialQuestion({
          id: 'personality-decision-pattern',
          text: '急な変更や予想外の出来事が起きたとき、最初に何をしましたか？',
          helpText: '実際の出来事を一つ選び、知らせを受けた場所、最初の行動、最初に連絡した人を書いてください。',
          answerType: 'long_text',
          order: 60,
          tags: ['人柄', '意思決定', '行動'],
          intent: '性格の自己評価ではなく、予想外の場面での初動から行動傾向を知る',
        }),
        initialQuestion({
          id: 'personality-joy',
          text: '時間を忘れるほど集中したことを一つ教えてください。',
          helpText: 'どこで、何をして、どのくらい続け、終わったときにどう感じたかを書いてください。',
          answerType: 'long_text',
          order: 70,
          tags: ['人柄', '喜び', '日常'],
          intent: '「自分らしさ」という抽象語を避け、没頭した行動から関心と喜びを知る',
        }),
        initialQuestion({
          id: 'personality-core-values',
          text: '見過ごせず、声をかけたり行動したりした場面を一つ教えてください。',
          helpText: '何が気になり、誰に対して、実際に何をしたかを書いてください。',
          answerType: 'long_text',
          order: 80,
          tags: ['価値観', '一貫性'],
          intent: '価値観を抽象語で答えさせず、放っておけなかった場面から大切にすることを知る',
        }),
        initialQuestion({
          id: 'personality-change',
          text: '昔はこう思っていたけれど、今は違うと感じることはありますか？',
          helpText: '以前の考え、見方が変わった一つの出来事、今の考えの順に書いてください。',
          answerType: 'long_text',
          order: 90,
          tags: ['価値観', '変化', '成長'],
          intent: '変わったことと変わらないことを同時に求めず、一つの考えの変化をたどる',
        }),
      ],
    },
    {
      id: 'legacy-future',
      title: '誇り・未来へ残すこと',
      description: '「最も」「社会への貢献」といった大きな評価を避け、実際の出来事と言葉で人生を結びます。',
      kind: 'theme',
      order: 80,
      enabled: true,
      questions: [
        initialQuestion({
          id: 'legacy-proud',
          text: '振り返って「自分はよくやった」と言える出来事を一つ教えてください。',
          helpText: '始めたころの状況、途中で続けたこと、終わった日の様子を書いてください。',
          answerType: 'long_text',
          order: 10,
          tags: ['誇り', '達成', '感謝'],
          intent: '人生で一番を選ばせず、本人が肯定できる具体的な過程を記録する',
        }),
        initialQuestion({
          id: 'legacy-contribution',
          text: 'ご自身が続けたことで、誰かの役に立ったと分かった場面を一つ教えてください。',
          helpText: '続けていたこと、相手の名前や関係、その人の言葉や反応を書いてください。',
          answerType: 'long_text',
          order: 20,
          tags: ['貢献', 'つながり'],
          intent: '社会的な貢献を自己評価させず、相手の具体的な反応から役割を知る',
        }),
        initialQuestion({
          id: 'legacy-younger-self',
          text: '何歳ごろのご自身に、今の自分から一言伝えたいですか？',
          helpText: '年齢、その一言、その言葉を伝えたい理由となる出来事を書いてください。',
          answerType: 'long_text',
          order: 30,
          tags: ['人生観', '振り返り'],
          intent: '対象となる年齢を先に定め、経験から得た言葉を具体化する',
        }),
        initialQuestion({
          id: 'legacy-preserve',
          text: '家族や次の世代に伝えたい、生活の知恵ややり方を一つ教えてください。',
          helpText: '料理、仕事、手入れ、人付き合いなどから一つ選び、実際の手順と伝えたい相手を書いてください。',
          answerType: 'long_text',
          order: 40,
          tags: ['継承', '未来', '価値観'],
          intent: '抽象的な教訓ではなく、再現できる知恵ややり方として残す',
        }),
        initialQuestion({
          id: 'legacy-message',
          text: 'この人生史を読んでほしい人を一人思い浮かべ、その人への言葉を書いてください。',
          helpText: '相手の名前や関係を書き、直接話しかけるように一文から始めてください。',
          answerType: 'long_text',
          order: 50,
          tags: ['メッセージ', '未来'],
          intent: '読み手を一人に定め、人生史の結びとなる具体的な本人の言葉を残す',
        }),
      ],
    },
  ],
};

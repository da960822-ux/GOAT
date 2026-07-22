import type { ImageSourcePropType } from "react-native";

export type ShowcasePlace = {
  id: string;
  name: string;
  area: string;
  image: ImageSourcePropType;
  match: number;
  kicker: string;
  description: string;
  tags: string[];
  address: string;
  bestTime: string;
  duration: string;
  transport: string;
  crowd: string;
  photoPoints: string[];
  tips: string[];
};

export const editorialImages = {
  beach: require("@/assets/images/editorial/beach.jpg"),
  coast: require("@/assets/images/editorial/coast-road.jpg"),
  forest: require("@/assets/images/editorial/forest.jpg"),
  garden: require("@/assets/images/editorial/garden.jpg"),
  harbor: require("@/assets/images/editorial/harbor.jpg"),
  hills: require("@/assets/images/editorial/hills.jpg"),
  resort: require("@/assets/images/editorial/resort.jpg"),
  village: require("@/assets/images/editorial/village.jpg"),
};

export const showcasePlaces: ShowcasePlace[] = [
  {
    id: "cheonhwaro",
    name: "천화로 해안도로",
    area: "강원 고성",
    image: editorialImages.coast,
    match: 98,
    kicker: "바다와 가장 가까운 드라이브",
    description: "고요한 동해와 작은 마을이 이어지는 길. 창문을 열고 천천히 달리기 좋은 강원도의 숨은 해안 코스예요.",
    tags: ["해안도로", "드라이브", "한적한"],
    address: "강원특별자치도 고성군 토성면 천화로",
    bestTime: "오전 9시–11시",
    duration: "약 1시간 30분",
    transport: "자차 추천",
    crowd: "여유로움",
    photoPoints: ["굽이진 도로 너머로 바다가 열리는 구간", "낮은 방파제와 작은 포구가 만나는 곳"],
    tips: ["해 뜬 직후에는 도로가 한산해요.", "바람이 강한 날은 얇은 겉옷을 챙겨주세요."],
  },
  {
    id: "samcheok",
    name: "삼척 새천년도로",
    area: "강원 삼척",
    image: editorialImages.beach,
    match: 94,
    kicker: "절벽 아래 펼쳐지는 푸른 동해",
    description: "기암절벽과 짙푸른 바다를 따라 이어지는 길. 잠깐 멈출 때마다 새로운 풍경이 나타나요.",
    tags: ["오션뷰", "산책", "사진 명소"],
    address: "강원특별자치도 삼척시 새천년도로",
    bestTime: "오후 3시–5시",
    duration: "약 2시간",
    transport: "자차·택시",
    crowd: "보통",
    photoPoints: ["소망의 탑 아래 해안 전망대", "바위 사이로 파도가 보이는 산책로"],
    tips: ["노을 한 시간 전에 도착해보세요.", "전망대 주차 공간이 작아요."],
  },
  {
    id: "daegwallyeong",
    name: "대관령 하늘목장",
    area: "강원 평창",
    image: editorialImages.hills,
    match: 91,
    kicker: "바람과 초원이 만드는 느린 하루",
    description: "완만한 언덕과 끝없이 이어지는 초원. 복잡한 생각을 내려놓고 오래 걷기 좋은 곳이에요.",
    tags: ["초원", "힐링", "가족 여행"],
    address: "강원특별자치도 평창군 대관령면 꽃밭양지길 458-23",
    bestTime: "오전 10시–정오",
    duration: "약 3시간",
    transport: "자차 추천",
    crowd: "보통",
    photoPoints: ["하늘과 맞닿은 전망대 오르는 길", "풍력 발전기가 보이는 초원 능선"],
    tips: ["고지대라 평지보다 기온이 낮아요.", "편한 운동화를 추천해요."],
  },
];

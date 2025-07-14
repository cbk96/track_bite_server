export const paymentMethod = {
  Credit_card: "카드결제",
  Pay_in_person_with_card: "만나서 결제 (카드)",
  Pay_in_person_with_cash: "만나서 결제 (현금)",
};

export const purchaseStatus = {
  Order_Placed: "주문완료",
  Preparing_for_Delivery: "배달준비중",
  Out_for_Delivery: "배달중",
  Delivered: "배달완료",
};

export const saleStatus = {
  soldout: "품절",
  onsale: "판매중",
};

export type PaymentMethod = keyof typeof paymentMethod;
export type PurchaseStatus = keyof typeof purchaseStatus;
export type SaleStatus = keyof typeof saleStatus;

export const paymentMethodKeys = Object.keys(
  paymentMethod
) as (keyof typeof paymentMethod)[];

export const purchaseStatusKeys = Object.keys(
  purchaseStatus
) as (keyof typeof purchaseStatus)[];

export const saleStatusKeys = Object.keys(
  saleStatus
) as (keyof typeof saleStatus)[];

export type Address = {
  postalCode: string; // 우편번호
  province: string; // 시/도 (예: 서울특별시, 경기도)
  city: string; // 구/군/구 (예: 강남구, 수원시)
  district: string; // 동/읍/면 (예: 역삼동, 원천동)
  streetName: string; // 도로명 (예: 테헤란로)
  detailAddress: string; // 상세주소 (선택사항, 예: 아파트 101동 201호)
};

export type CompactAddress = {
  address1: string;
  address2: string;
};

export type Store = {
  storeId: string;
  storePublicId: string;
  password: string;
  storeName: string; //가게명
  name: string; //사업주명
  address: Address; //가게주소
  tel: string;
  logoPath?: string;
  category: string; // 가게 취급 식품 카테고리
  joinDate: Date; //가입 일자
  inactive: boolean; //영업 정지 여부
  notification?: string; //공지
  businessType: string;
  businessNumber: string;
  paymentMethod: PaymentMethod[];
  minOrderAmount: number;
};

export type AdminLoginId = string;

export type LoginAdmin = Omit<Store, "password" | "joinDate"> & {
  logined: boolean;
};

export type StorePublicInfo = Omit<Store, "storeId" | "password"> & {
  reviewCount?: number;
  reviewScore?: number;
};

export type Menu = {
  menuId: string;
  menuName: string;
  storeId: string;
  menuGroupId: string;
  price: number;
  menuDescrip: string;
  imagePath: string;
  stock: number;
  optionGroupId: string[]; //OptionGroup의 optionGroupId 참조
  saleStatus: string;
  order: number;
};

export type MenuPublicInfo = Omit<Menu, "storeId">;

export type Option = {
  optionId: string;
  optionGroupId: string;
  storeId: string;
  optionName: string;
  price: number;
  stock: number;
  order: number;
};

export type OptionPublicInfo = Omit<Option, "storeId">;

export type SortedOptions = {
  optionGroupId: string;
  groupName: string;
  required: boolean;
  selectionType: "single" | "multi"; //단일, 복수 선택여부
  optionCount: number;
  options: Option[] | OptionPublicInfo[];
};

export type Cart = {
  cartId: string;
  storePublicId: string;
  customerId: string;
  date: Date;
  quanti: number;
  sumPrice: number;
  menu: Omit<MenuPublicInfo, "optionGroupId" | "order" | "stock">;
  option: SortedOptions[];
};

//주문목록
export type Purchase = Omit<Cart, "cartId"> & {
  purchaseId: string;
  purchasePackageId: string;
  storeName: string;
  logoPath?: string;
  name: string;
  totalPrice: number;
  paymentMethod: string;
  cardNumber: string;
  usedCouponIds: string[];
  couponDiscountPrice: number;
  purStatus: PurchaseStatus;
  address: CompactAddress;
  tel: string;
  deliRequest?: string;
  date: Date;
  businessFee: number;
};

export type OperatingHours = {
  storeId?: string;
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  open: string;
  close: string;
  order: number;
};

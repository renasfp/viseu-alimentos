export type Food = {
  id: number;
  name: string;
  category: string;
  market: string;
  portionType: string;
  portionSize: number;
  calories: number;
  ranking: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FoodInput = {
  name: string;
  category: string;
  market: string;
  portionType: string;
  portionSize: number;
  calories: number;
  ranking: number;
  imageUrl: string | null;
};

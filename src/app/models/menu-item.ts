export interface MenuItemDTO {
  menuItemId: number;
  label: string;
  icon: string;
  link: string;
  parentId?: number | null;
  isTitle?: number;
  isLayout?: number;
  createdAt?: string;
  updatedAt?: string;
}
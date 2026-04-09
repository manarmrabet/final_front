export interface MenuItemDTO {
  menuItemId: number;
  label: string;
  icon: string;
  link: string;
  parentId?: number | null;
  isTitle?: boolean;
  isLayout?: boolean;
  createdAt?: string;
  updatedAt?: string;

  children?: MenuItemDTO[];
  isExpanded?: boolean;
}

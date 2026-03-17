export interface Role {
  roleId?: number;
  roleName: string;
  description?: string;
}

export interface Site {
  idSite?: number;
  siteName: string;
}

export interface UserDTO {
  Id?: number;
  id?: number;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  siteName?: string;
  isActive?: number;
  authorities: string[];
  token?: string;
  credentialsSent?: boolean;
  mustChangePassword?: boolean;
}





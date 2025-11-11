export interface BaseDto {
    id: number;
    createdAt: string;
    updatedAt: string | null;
    createdBy: string;
    updatedBy: string | null;
    isActive: boolean;  
}
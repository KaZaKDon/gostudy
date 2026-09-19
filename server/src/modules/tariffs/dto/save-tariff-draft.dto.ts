import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsInt,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class SaveTariffDraftDto {
    @IsString()
    @MinLength(3)
    @MaxLength(120)
    page_title: string;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    page_lead: string;

    @IsString()
    @MinLength(3)
    @MaxLength(100)
    individual_title: string;

    @IsString()
    @MinLength(3)
    @MaxLength(80)
    individual_badge: string;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    individual_summary: string;

    @IsInt()
    @Min(0)
    @Max(10_000_000)
    individual_price_rubles: number;

    @IsInt()
    @Min(1)
    @Max(366)
    individual_period_days: number;

    @IsInt()
    @Min(1)
    @Max(10_000)
    individual_students_included: number;

    @IsInt()
    @Min(1)
    @Max(10_000)
    individual_extra_block_students: number;

    @IsInt()
    @Min(0)
    @Max(10_000_000)
    individual_extra_block_price_rubles: number;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    individual_recalculation_text: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(8)
    @IsString({ each: true })
    @MinLength(3, { each: true })
    @MaxLength(240, { each: true })
    individual_features: string[];

    @IsString()
    @MinLength(3)
    @MaxLength(100)
    business_title: string;

    @IsString()
    @MinLength(3)
    @MaxLength(80)
    business_badge: string;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    business_summary: string;

    @IsInt()
    @Min(0)
    @Max(100)
    business_commission_percent: number;

    @IsInt()
    @Min(0)
    @Max(10_000_000)
    business_minimum_payout_rubles: number;

    @IsString()
    @MinLength(3)
    @MaxLength(100)
    business_payout_frequency: string;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    business_settlement_text: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(8)
    @IsString({ each: true })
    @MinLength(3, { each: true })
    @MaxLength(240, { each: true })
    business_features: string[];

    @IsString()
    @MinLength(3)
    @MaxLength(120)
    materials_title: string;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    materials_lead: string;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    materials_personal_library_text: string;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    materials_free_catalog_text: string;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    materials_individual_sales_text: string;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    materials_business_sales_text: string;

    @IsInt()
    @Min(0)
    @Max(100)
    materials_sale_commission_percent: number;

    @IsInt()
    @Min(0)
    @Max(366)
    materials_payout_hold_days: number;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    materials_licenses_text: string;

    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    materials_moderation_text: string;

    @IsString()
    @MinLength(10)
    @MaxLength(700)
    notice: string;
}

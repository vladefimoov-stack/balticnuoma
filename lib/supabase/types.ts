import type { Database, Enums, Tables } from "./database.types";

export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";

/* Convenience aliases for the most used rows and enums. */
export type Car = Tables<"cars">;
export type CarImage = Tables<"car_images">;
export type Category = Tables<"categories">;
export type Make = Tables<"makes">;
export type VehicleModel = Tables<"vehicle_models">;
export type BaseModel = Tables<"base_models">;
export type CarModelVersion = Tables<"car_model_versions">;
export type ModelJob = Tables<"model_jobs">;
export type Booking = Tables<"bookings">;
export type Block = Tables<"blocks">;
export type Setting = Tables<"settings">;
export type Profile = Tables<"profiles">;
export type BusyPeriod = Database["public"]["Views"]["car_busy_periods"]["Row"];

export type CarStatus = Enums<"car_status">;
export type BodyType = Enums<"body_type">;
export type RentalType = Enums<"rental_type">;
export type BookingStatus = Enums<"booking_status">;
export type ModelSource = Enums<"model_source">;
export type ModelJobStatus = Enums<"model_job_status">;
export type AppRole = Enums<"app_role">;
export type PlatformDriver = Enums<"platform_driver">;

/** Postgres SQLSTATE for an exclusion-constraint violation (dates already taken). */
export const PERIOD_UNAVAILABLE_SQLSTATE = "23P01";

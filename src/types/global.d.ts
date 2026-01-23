type KeyOf<T> = keyof T;
type ValueOf<T> = T[keyof T];
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

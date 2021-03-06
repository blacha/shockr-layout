export interface ClientLibMap<T> {
    /** Id to record map */
    d: Record<string, T>;
    /** Number of records */
    c: number;
}

export interface ClientLibList<T> {
    l: T[];
}

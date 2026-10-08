/** Joker memory of one side: Копилка ярости charge, Чистюля streak, Коллекционер growth (run-wide). */
export type JokerState = { readonly rage: number; readonly cleanStreak: number; readonly collected: number };

export const EMPTY_JOKER_STATE: JokerState = { rage: 0, cleanStreak: 0, collected: 0 };

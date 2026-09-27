type BaseQuery = { instructions: string };

export type ChoiceQuery = BaseQuery & { type: "choice"; criteria: string[] | Record<string, string> };
export type ScoreQuery = BaseQuery & { type: "score"; criteria: string[] };
export type NoulQuery = BaseQuery & { type: "noul" };

export type Query = ChoiceQuery | ScoreQuery | NoulQuery;
export type Querys = Record<string, Query>;

export type Answers = {
    type: string;
    choice?: string;
    score?: number;  
    noul?: number;     
    probabilities?: Record<string, number>;
    confidence?: number;
    answerConfidence?: number;
    [field: string]: unknown;
}

export type AIResponse = {
  answers: Record<string, Answers>;
  [field: string]: unknown;
}
 
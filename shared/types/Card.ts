export interface Player{
    id:number,
    name:String,
    score:number
}

export interface Card{
    id:number,
    rank:String,
    suit:Demonination,
    color:deckColors
}

export type Demonination =
"club" | "spade" | "heart" | "diamond";

export type deckColors = 
"red" | "black"
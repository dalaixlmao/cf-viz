const rankColors = {
    "legendary grandmaster": "text-red-600",
    "international grandmaster": "text-red-600",
    "grandmaster": "text-red-600",
    "international master": "text-orange-600",
    "master": "text-orange-600",
    "candidate master": "text-violet-600",
    "expert": "text-blue-600",
    "specialist": "text-cyan-600",
    "pupil": "text-green-600",
    "newbie": "text-gray-600",
  };
  
export type Rank = keyof typeof rankColors;

export default function RatingComponent({
  rating,
  maxRating,
  rank,
  maxRank,
}: {
  rating: number;
  rank: Rank;
  maxRating: number;
  maxRank: Rank;
}) {
      
  function getColor(rank: Rank): string {
    return rankColors[rank];
  }

  return (
    <div className="flex flex-col md:flex-row justify-between mt-5 border-b pb-6">
      <div className="flex flex-col items-center md:items-start">
        <div className="text-2xl font-bold">Rating {rating}</div>
        <div className={`font-light ${getColor(rank)}`}>{rank[0].toUpperCase()+rank.slice(1)}</div>
      </div>
      <div className="flex flex-col mt-5 md:mt-0  items-center md:items-end">
        <div className="text-2xl font-bold text-center md:text-left">Maximum rating {maxRating}</div>
        <div className={`font-light ${getColor(maxRank)}`}>{maxRank[0].toUpperCase()+maxRank.slice(1)}</div>
      </div>
    </div>
  );
}

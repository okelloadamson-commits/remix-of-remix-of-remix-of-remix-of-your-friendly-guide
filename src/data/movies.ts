import actionHero from "@/assets/posters/action-hero.jpg";
import horrorNight from "@/assets/posters/horror-night.jpg";
import loveStory from "@/assets/posters/love-story.jpg";
import spaceOdyssey from "@/assets/posters/space-odyssey.jpg";
import dragonRealm from "@/assets/posters/dragon-realm.jpg";
import darkSecrets from "@/assets/posters/dark-secrets.jpg";
import royalPalace from "@/assets/posters/royal-palace.jpg";
import detective from "@/assets/posters/detective.jpg";
import treasureHunt from "@/assets/posters/treasure-hunt.jpg";
import nightGuardian from "@/assets/posters/night-guardian.jpg";
import warZone from "@/assets/posters/war-zone.jpg";
import magicalForest from "@/assets/posters/magical-forest.jpg";

export interface Movie {
  id: string;
  title: string;
  poster: string;
  rating: number;
  year: number;
  country: string;
  type: "movie" | "series";
  genre: string[];
  duration?: string;
  episodes?: number;
  seasons?: number;
  subtitles: string[];
  description: string;
}

export const movies: Movie[] = [
  {
    id: "1",
    title: "Action Hero",
    poster: actionHero,
    rating: 8.2,
    year: 2024,
    country: "USA",
    type: "movie",
    genre: ["Action", "Thriller"],
    duration: "02:15:30",
    subtitles: ["English", "Spanish", "French"],
    description: "A retired special forces operative must return to action when his family is threatened by a powerful crime syndicate.",
  },
  {
    id: "2",
    title: "Horror Night",
    poster: horrorNight,
    rating: 7.5,
    year: 2024,
    country: "UK",
    type: "movie",
    genre: ["Horror", "Mystery"],
    duration: "01:52:00",
    subtitles: ["English", "German"],
    description: "A family moves into an old Victorian house, unaware of the dark secrets that lurk within its walls.",
  },
  {
    id: "3",
    title: "Love in the City",
    poster: loveStory,
    rating: 7.8,
    year: 2024,
    country: "France",
    type: "movie",
    genre: ["Romance", "Comedy"],
    duration: "01:45:00",
    subtitles: ["English", "French", "Italian"],
    description: "Two strangers meet by chance in Paris and embark on a whirlwind romance that changes their lives forever.",
  },
  {
    id: "4",
    title: "Space Odyssey",
    poster: spaceOdyssey,
    rating: 8.5,
    year: 2025,
    country: "USA",
    type: "movie",
    genre: ["Sci-Fi", "Adventure"],
    duration: "02:30:00",
    subtitles: ["English", "Spanish", "Japanese", "Korean"],
    description: "A crew of astronauts discovers a mysterious signal from deep space that could change humanity's understanding of the universe.",
  },
  {
    id: "5",
    title: "Dragon Realm",
    poster: dragonRealm,
    rating: 8.0,
    year: 2024,
    country: "UK",
    type: "series",
    genre: ["Fantasy", "Drama"],
    episodes: 10,
    seasons: 2,
    subtitles: ["English", "Spanish", "French", "German"],
    description: "In a world where dragons rule the skies, a young princess must unite the kingdoms to save her people from an ancient evil.",
  },
  {
    id: "6",
    title: "Dark Secrets",
    poster: darkSecrets,
    rating: 7.9,
    year: 2024,
    country: "Germany",
    type: "movie",
    genre: ["Thriller", "Crime"],
    duration: "02:05:00",
    subtitles: ["English", "German", "French"],
    description: "A journalist uncovers a web of corruption that leads to the highest levels of government.",
  },
  {
    id: "7",
    title: "Royal Palace",
    poster: royalPalace,
    rating: 8.3,
    year: 2025,
    country: "Korea",
    type: "series",
    genre: ["Drama", "History", "Fantasy"],
    episodes: 16,
    seasons: 1,
    subtitles: ["English", "Korean", "Spanish", "Indonesian"],
    description: "A French chef mysteriously travels back in time to the Joseon Dynasty and must cook fusion cuisine for a demanding king.",
  },
  {
    id: "8",
    title: "The Detective",
    poster: detective,
    rating: 8.1,
    year: 2024,
    country: "USA",
    type: "series",
    genre: ["Crime", "Drama"],
    episodes: 8,
    seasons: 3,
    subtitles: ["English", "Spanish"],
    description: "A brilliant but troubled detective solves the city's most complex cases while battling his own demons.",
  },
  {
    id: "9",
    title: "Treasure Hunt",
    poster: treasureHunt,
    rating: 7.7,
    year: 2024,
    country: "USA",
    type: "movie",
    genre: ["Adventure", "Action"],
    duration: "02:20:00",
    subtitles: ["English", "Spanish", "Portuguese"],
    description: "An archaeologist races against a rival to find a legendary treasure hidden in an ancient temple.",
  },
  {
    id: "10",
    title: "Night Guardian",
    poster: nightGuardian,
    rating: 8.4,
    year: 2024,
    country: "USA",
    type: "movie",
    genre: ["Action", "Superhero"],
    duration: "02:25:00",
    subtitles: ["English", "Spanish", "French", "German", "Japanese"],
    description: "A masked vigilante protects the city from a new wave of crime while uncovering a conspiracy that threatens everything.",
  },
  {
    id: "11",
    title: "War Zone",
    poster: warZone,
    rating: 8.6,
    year: 2024,
    country: "USA",
    type: "movie",
    genre: ["War", "Drama"],
    duration: "02:45:00",
    subtitles: ["English", "Russian", "German"],
    description: "Based on true events, this film follows a group of soldiers during one of the most intense battles of modern warfare.",
  },
  {
    id: "12",
    title: "Magical Forest",
    poster: magicalForest,
    rating: 7.6,
    year: 2025,
    country: "USA",
    type: "movie",
    genre: ["Animation", "Family", "Fantasy"],
    duration: "01:35:00",
    subtitles: ["English", "Spanish", "French", "German", "Japanese", "Korean"],
    description: "A group of magical creatures must save their enchanted forest from an evil sorcerer who wants to destroy all magic.",
  },
];

export const getMoviesByCategory = (category: string): Movie[] => {
  switch (category) {
    case "trending":
      return movies.slice(0, 6);
    case "popular":
      return movies.filter((m) => m.type === "movie").slice(0, 6);
    case "top-series":
      return movies.filter((m) => m.type === "series");
    case "recently-added":
      return [...movies].reverse().slice(0, 6);
    case "action":
      return movies.filter((m) => m.genre.includes("Action"));
    case "comedy":
      return movies.filter((m) => m.genre.includes("Comedy") || m.genre.includes("Animation"));
    default:
      return movies.slice(0, 6);
  }
};

export const getMovieById = (id: string): Movie | undefined => {
  return movies.find((m) => m.id === id);
};

export const getRelatedMovies = (movie: Movie): Movie[] => {
  return movies
    .filter((m) => m.id !== movie.id && m.genre.some((g) => movie.genre.includes(g)))
    .slice(0, 6);
};

import axios from "axios";

export const spotifyClient = axios.create({
  baseURL: "https://api.spotify.com/v1",
});

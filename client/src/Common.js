const IS_PRODUCTION_MODE = true;
// make above true for deploying

export const backendURL = IS_PRODUCTION_MODE
    ? "http://kylerim.cse356.compas.cs.stonybrook.edu"
    : "http://localhost:5001";
export const endpointLogIn = backendURL + "/users/login";
export const endpointLogOut = backendURL + "/users/logout";
export const endpointSignUp = backendURL + "/users/signup";
export const endpointDocList = backendURL + "/collection/list";
export const endpointCreateDoc = backendURL + "/collection/create";
export const endpointDeleteDoc = backendURL + "/collection/delete";

export const endpointSearch = backendURL + "/index/search";
export const endpointSuggest = backendURL + "/index/suggest";

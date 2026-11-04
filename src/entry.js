import { mount } from "svelte";
import App from "./App.svelte";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";

mount(App, { target: document.getElementById("app") });

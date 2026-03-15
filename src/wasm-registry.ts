// @ts-ignore
import v1_0_2 from "../assets/test-v1.0.2.wasm";
// @ts-ignore
import v1_0_3 from "../assets/test-v1.0.3.wasm";

export const CLOUDFLARE_WASM_ASSETS: Record<string, any> = {
    "1.0.2": v1_0_2,
    "1.0.3": v1_0_3,
};

export const SUPPORTED_VERSIONS = ["1.0.2", "1.0.3"];

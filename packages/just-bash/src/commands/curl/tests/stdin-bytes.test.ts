import { afterEach, expect, it, vi } from "vitest";
import { Bash } from "../../../Bash.js";

afterEach(() => vi.unstubAllGlobals());

it("preserves invalid UTF-8 bytes in binary stdin request bodies", async () => {
  const fetch = vi.fn(async () => new Response("OK"));
  vi.stubGlobal("fetch", fetch);
  const bash = new Bash({
    files: { "/payload": new Uint8Array([0x80, 0xff]) },
    network: {
      allowedUrlPrefixes: ["https://api.example.com"],
      allowedMethods: ["POST"],
    },
  });
  const result = await bash.exec(
    "cat /payload | curl --data-binary @- https://api.example.com",
  );
  expect(result).toMatchObject({ stdout: "OK", stderr: "", exitCode: 0 });
  expect(fetch).toHaveBeenCalledWith(
    "https://api.example.com/",
    expect.objectContaining({ body: new Uint8Array([0x80, 0xff]) }),
  );
});

it("consumes stdin once across ordered data references", async () => {
  const fetch = vi.fn(async () => new Response("OK"));
  vi.stubGlobal("fetch", fetch);
  const bash = new Bash({
    network: {
      allowedUrlPrefixes: ["https://api.example.com"],
      allowedMethods: ["POST"],
    },
  });
  const result = await bash.exec("curl -d @- -d @- https://api.example.com", {
    stdin: "abc",
  });
  expect(result).toMatchObject({ stdout: "OK", stderr: "", exitCode: 0 });
  expect(fetch).toHaveBeenCalledWith(
    "https://api.example.com/",
    expect.objectContaining({ body: "abc&" }),
  );
});

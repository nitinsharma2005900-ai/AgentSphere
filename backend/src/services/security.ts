import crypto from "crypto";
import { config } from "../config";
export const hash = (text:string) => crypto.createHash("sha256").update(text).digest("hex");
export function encrypt(value:string):string {
  const iv=crypto.randomBytes(12), key=crypto.createHash("sha256").update(config.encryptionKey).digest();
  const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);
  return [iv.toString("hex"),cipher.update(value,"utf8","hex")+cipher.final("hex"),cipher.getAuthTag().toString("hex")].join(":");
}
export function decrypt(value:string):string {
  const [iv,body,tag]=value.split(":"), key=crypto.createHash("sha256").update(config.encryptionKey).digest();
  const decipher=crypto.createDecipheriv("aes-256-gcm",key,Buffer.from(iv,"hex"));
  decipher.setAuthTag(Buffer.from(tag,"hex")); return decipher.update(body,"hex","utf8")+decipher.final("utf8");
}
export function redact(text:string) {
  return text.replace(/(?:AIza[\w-]{30,}|(?:sk-|gh[pousr]_)[\w-]{20,}|Bearer\s+[\w.\-]{20,}|postgres(?:ql)?:\/\/[^\s]+|redis[s]?:\/\/[^\s]+)/gi,"[REDACTED]");
}

export function redactValue(value:any):any {if(typeof value==="string")return redact(value);if(Array.isArray(value))return value.map(redactValue);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,redactValue(item)]));return value;}

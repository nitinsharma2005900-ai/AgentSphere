/** @type {import('next').NextConfig} */
const backend=process.env.BACKEND_URL||'http://127.0.0.1:5000';
const nextConfig={
 reactStrictMode:true,output:'standalone',poweredByHeader:false,
 async rewrites(){return [{source:'/api/backend/:path*',destination:`${backend}/api/v1/:path*`}];},
 async headers(){return [{source:'/:path*',headers:[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: http://localhost:5000 ws://localhost:3000; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"}
 ]}];}
};module.exports=nextConfig;

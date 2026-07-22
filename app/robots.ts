import type {MetadataRoute} from "next";
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:"*",allow:"/",disallow:["/portal","/integracoes"]},sitemap:"https://www.imts.com.br/sitemap.xml"}}

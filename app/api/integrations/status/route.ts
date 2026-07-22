import {publicIntegrationFlags} from "../../../integrations/catalog";
export async function GET(){return Response.json({ok:true,module:"imts-site-integration-gateway",version:"1.0.0",capabilities:publicIntegrationFlags(),timestamp:new Date().toISOString()},{headers:{"cache-control":"no-store"}})}

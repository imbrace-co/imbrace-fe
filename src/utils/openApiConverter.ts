/**
 * Convert OpenAPI specification to tool payload format
 * @param openApiSpec - OpenAPI specification object
 * @returns Array of tool payloads
 */
export const convertOpenApiToToolPayload = (openApiSpec: any) => {
    if (!openApiSpec || !openApiSpec.paths) {
        return [];
    }

    const tools: any[] = [];

    // Iterate through all paths in the OpenAPI spec
    Object.entries(openApiSpec.paths).forEach(([path, methods]: [string, any]) => {
        // Iterate through all HTTP methods for this path
        Object.entries(methods).forEach(([method, operation]: [string, any]) => {
            if (typeof operation === 'object' && operation.operationId) {
                const tool = {
                    name: operation.operationId || `${method}_${path.replace(/\//g, '_')}`,
                    description: operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
                    parameters: extractParameters(operation),
                    method: method.toUpperCase(),
                    path: path,
                };

                tools.push(tool);
            }
        });
    });

    return tools;
};

/**
 * Extract parameters from OpenAPI operation
 */
const extractParameters = (operation: any) => {
    const parameters: any = {
        type: 'object',
        properties: {},
        required: [],
    };

    // Handle path parameters, query parameters, headers
    if (operation.parameters && Array.isArray(operation.parameters)) {
        operation.parameters.forEach((param: any) => {
            if (param.name) {
                parameters.properties[param.name] = {
                    type: param.schema?.type || 'string',
                    description: param.description || '',
                };

                if (param.required) {
                    parameters.required.push(param.name);
                }
            }
        });
    }

    // Handle request body
    if (operation.requestBody) {
        const content = operation.requestBody.content;
        if (content && content['application/json']) {
            const schema = content['application/json'].schema;
            if (schema && schema.properties) {
                Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                    parameters.properties[propName] = {
                        type: propSchema.type || 'string',
                        description: propSchema.description || '',
                    };
                });

                if (schema.required && Array.isArray(schema.required)) {
                    parameters.required.push(...schema.required);
                }
            }
        }
    }

    return parameters;
};


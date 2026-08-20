const sampleMessage = {
    business_unit_id: 'bu_imbrace_testing',
    channel_id: 'imbrace_channel',
    channel_type: 'web',
    content: { text: 'XXX has created a video call. Please join via the link below: https://google.com?room=dfgdrfg4g3t3g$@%R$@#', url: 'https://google.com?room=dfgdrfg4g3t3g$@%R$@#' },
    conversation_id: 'conv_0843d252-cef9-4669-aaf1-3568198afc31',
    created_at: new Date(),
    from: 'u_imbrace_admin',
    id: 'msg_5d21edf3-a621-430c-808c-3a358a111111',
    object_name: 'message',
    organization_id: 'org_imbrace',
    type: 'jaas.conference',
    updated_at: new Date(),
};

export default sampleMessage

// TESTING IN DASHBOARD PAGE
// {teamConv.conversationMessages?.length > 0 && (
//     <Message
//         index={teamConv.conversationMessages?.length}
//         key={sampleMsg.id}
//         id={sampleMsg.id}
//         from={sampleMsg.from}
//         text={sampleMsg.text}
//         type={sampleMsg.type}
//         imageUrl={sampleMsg.image_url}
//         createdAt={sampleMsg.created_at}
//         updatedAt={sampleMsg.updated_at}
//         organizationId={sampleMsg.organization_id}
//         businessUnitId={sampleMsg.business_unit_id}
//         roomId={teamConv.conversationMessages[0].room_id}
//         quickReplies={sampleMsg.quick_replies}
//         content={sampleMsg.content}
//     />
// )}

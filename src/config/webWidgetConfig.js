export const breadcrumbList = [
    { pathname: '/web_widget', destination: 'web_widget_destination_1', step: 1 },
    { pathname: '/web_widget/:id', destination: 'web_widget_destination_2', step: 2 },
];

export const colorOptions = [
    {
        id: '001',
        primaryColor: '#1E92DF',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '002',
        primaryColor: '#FA9917',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '003',
        primaryColor: '#FF6A04',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '004',
        primaryColor: '#F3947E',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '005',
        primaryColor: '#90181A',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '006',
        primaryColor: '#EFDAEB',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '007',
        primaryColor: '#FF3366',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '008',
        primaryColor: '#144E5A',
        secondaryColor: '#FFFFFF',
    },
    {
        id: '009',
        primaryColor: '#CD9ACA',
        secondaryColor: '#FFFFFF',
    },
];

// OBSOLETE (ALL SECONDARY COLORS CHANGED TO #FFFFFF)
// export const colorOptions = [
//     {
//         id: "001",
//         primaryColor: "#1E92DF",
//         secondaryColor: "#FFFFFF"
//     },
//     {
//         id: "002",
//         primaryColor: "#FA9917",
//         secondaryColor: "#FFFFFF"
//     },
//     {
//         id: "003",
//         primaryColor: "#FF6A04",
//         secondaryColor: "#14133D"
//     },
//     {
//         id: "004",
//         primaryColor: "#F3947E",
//         secondaryColor: "#723B27"
//     },
//     {
//         id: "005",
//         primaryColor: "#90181A",
//         secondaryColor: "#D1D8DC"
//     },
//     {
//         id: "006",
//         primaryColor: "#EFDAEB",
//         secondaryColor: "#9F864E"
//     },
//     {
//         id: "007",
//         primaryColor: "#FF3366",
//         secondaryColor: "#FFFFFF"
//     },
//     {
//         id: "008",
//         primaryColor: "#144E5A",
//         secondaryColor: "#F8F7C1"
//     },
//     {
//         id: "009",
//         primaryColor: "#CD9ACA",
//         secondaryColor: "#4B176C"
//     },
// ]

// RANDOM COLOR OPTIONS
// export const colorOptions = Array(10).fill(null).map((_, i) => {

//     const randomPrimaryColor = Math.floor(Math.random() * 16777215).toString(16);
//     const randomSecondaryColor = Math.floor(Math.random() * 16777215).toString(16);

//     return {
//         id: i,
//         primaryColor: "#" + randomPrimaryColor,
//         secondaryColor: "#" + randomSecondaryColor
//     }
// })

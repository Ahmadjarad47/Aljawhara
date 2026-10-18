export const environment = {
    apiUrl: 'https://api.aljawharaplus.com/api/',

    // apiUrl: 'https://localhost:7130/api/',
    maintenance: {
        // فعّل الصيانة محليًا بإسناد true. false يعيد الموقع للعمل.
        enabled: false,
        title: 'نُجري بعض التحسينات',
        message: 'الموقع متوقف مؤقتًا لإجراء أعمال الصيانة والتحديث، لنقدّم لكم تجربة أفضل. سنعود لخدمتكم قريبًا.',
        showRetryButton: true,
    },  
};
// sudo cp /var/www/html/index.csr.html /var/www/html/index.html
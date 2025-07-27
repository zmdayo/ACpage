document.addEventListener('DOMContentLoaded', function() {
    if (window.innerWidth < 380)
        alert("请注意，本网页在您的设备上可能会出现显示问题。");
    //APlayer加载音乐
    const ap = new APlayer({
        container: document.getElementById('aplayer'),
        fixed: true,
        autoplay: true,
        audio: [{
            name: 'world.execute (me) ; (Key Ingredient ver.) (Instrumental)',
            artist: "Mili",
            url: '/static/wem.opus',
            cover: '/static/wem.webp'
        }]
    });
});
export type Tier = 'common' | 'rare' | 'legendary';
export type Category = 'Áo' | 'Quần' | 'Váy' | 'Đầm' | 'Phụ kiện';
export type FashionItem = {
 id: number;
 name: string;
 categories: Category[];
 tier: Tier;
 salePrice: number;
 originalPrice: number;
 image: string;
 galleryImages: string[];
 productUrl?: string;
};
export const items: FashionItem[] = [
 {id:1,name:'Đầm chấm bi phối buộc eo',categories:['Đầm'],tier:'rare',salePrice:199000,originalPrice:729000,image:'/assets/card-items-transparent/dam-nau-cham-bi.png',galleryImages:['/assets/dam_nau_cham_bi/1.png','/assets/dam_nau_cham_bi/2.png'],productUrl:'https://maybi.com/products/dam-cham-bi-phoi-buoc-eo'},
 {id:2,name:'Đầm cúp ngực ôm phối voan',categories:['Đầm'],tier:'legendary',salePrice:199000,originalPrice:749000,image:'/assets/card-items-transparent/dam-cup-nguc-voan.png',galleryImages:['/assets/dam-cup-nguc-om-phoi-voan/1.png','/assets/dam-cup-nguc-om-phoi-voan/2.png'],productUrl:'https://maybi.com/products/dam-cup-nguc-om-phoi-voan'},
 {id:3,name:'Đầm hoa vàng cổ tim',categories:['Đầm'],tier:'rare',salePrice:199000,originalPrice:729000,image:'/assets/card-items-transparent/dam-hoa-vang.png',galleryImages:['/assets/dam-hoa-vang-co-tim/1.png','/assets/dam-hoa-vang-co-tim/2.png'],productUrl:'https://maybi.com/products/dam-hoa-vang-co-tim'},
 {id:4,name:'Đầm lụa 2 dây babydoll 3 tầng',categories:['Đầm'],tier:'legendary',salePrice:199000,originalPrice:789000,image:'/assets/card-items-transparent/dam-babydoll.png',galleryImages:['/assets/dam-lua-2-day-babydoll-3tang/1.png','/assets/dam-lua-2-day-babydoll-3tang/2.png'],productUrl:'https://maybi.com/products/dam-lua-2-day-babydoll-3-tang'},
 {id:5,name:'Set áo voan cổ V phối chân váy',categories:['Áo','Váy'],tier:'rare',salePrice:199000,originalPrice:829000,image:'/assets/card-items-transparent/set-ao-den-vay-trang.png',galleryImages:['/assets/set_ao_den_chan_vay_trang/1.png','/assets/set_ao_den_chan_vay_trang/2.png'],productUrl:'https://maybi.com/products/set-ao-voan-co-v-phoi-chan-vay'},
 {id:6,name:'Set áo kiểu cotton đỏ lệch vai phối quần dài',categories:['Áo','Quần'],tier:'legendary',salePrice:199000,originalPrice:819000,image:'/assets/card-items-transparent/set-do-do.png',galleryImages:['/assets/set_do_do_quan_ong_rong.png/1.png','/assets/set_do_do_quan_ong_rong.png/2.png'],productUrl:'https://maybi.com/products/set-ao-kieu-cotton-do-lech-vai-phoi-quan-dai-2'},
 {id:7,name:'Set áo voan bèo nhún và chân váy tầng nữ tính Celeste',categories:['Áo','Váy'],tier:'rare',salePrice:199000,originalPrice:699000,image:'/assets/card-items-transparent/set-xanh-celeste.png',galleryImages:['/assets/set-ao-voan-beo-nhun/1.png','/assets/set-ao-voan-beo-nhun/2.png'],productUrl:'https://maybi.com/products/ao-bong-tay-loe-phoi-nhun-beo-va-chan-vay-ba-tang-nhun-beo'},
 {id:8,name:'Đầm ren dài đính đá',categories:['Đầm'],tier:'legendary',salePrice:199000,originalPrice:899000,image:'/assets/card-items-transparent/dam-ren-dinh-da.png',galleryImages:['/assets/set-ao-voan-co-v/1.png','/assets/set-ao-voan-co-v/2.png'],productUrl:'https://maybi.com/products/dam-ren-dai-dinh-da'},
];
export const tierLabel: Record<Tier,string>={common:'Phổ thông',rare:'Hiếm',legendary:'Huyền thoại'};
export const formatPrice = (price:number) => `${price.toLocaleString('vi-VN')}đ`;

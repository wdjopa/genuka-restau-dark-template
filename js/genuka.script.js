let datas = null;
if (localStorage.getItem("client")) {
  datas = localStorage.getItem("client") ? JSON.parse(localStorage.getItem("client")).id : null;
}
let url = "https://dashboard.genuka.com/api/2021-05";
let storage_url = "https://dashboard.genuka.com/storage";

let shop = null,
  cart = {
    content: {},
    total: { items: 0, total_price: 0 },
    reduction: {},
    created_at: new Date(),
    updated_at: new Date(),
    livraison: {},
  };

if (localStorage.getItem("cart")) {
  cart = JSON.parse(localStorage.getItem("cart"));
}
if (!datas) {
  $.ajax({
    type: "GET",
    // url: url + "/companies/details/6",
    url: url + "/companies/byurl?url=" + window.location.protocol + "//" + window.location.hostname,
    contentType: "application/json",
    dataType: "json",
    success: (data) => {
      shop = data;
      loadShop(shop);

      localStorage.setItem("shop", JSON.stringify(shop));
    },
  });
  // fetch(url + "/companies/details/249").then(function (response) {
  // fetch(url + "/companies/byurl?url=" + window.location.protocol + "//" + window.location.hostname).then(function (response) {
  //   var contentType = response.headers.get("content-type");
  //   if (contentType && contentType.indexOf("application/json") !== -1) {
  //     return response.json().then((clt) => {
  //       shop = clt;
  //       loadShop(shop);

  //       localStorage.setItem("shop", JSON.stringify(clt));
  //     });
  //   }
  // });
} else {
  fetch(url + "/companies/details/" + datas).then(function (response) {
    var contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json().then((clt) => {
        shop = clt;
        loadShop(shop);
        localStorage.setItem("shop", JSON.stringify(clt));
      });
    }
  });
}

let token = "";
let collections = [],
  all_products = {};

function show_cart() {
  $("#cartModal").modal("toggle");
  update_shopping_cart();
}
function remove(id) {
  if (cart.content[id].quantity == 1) {
    delete cart.content[id];
  } else {
    cart.content[id].quantity = cart.content[id].quantity - 1;
  }
  cart.total.items = cart.total.items - 1;
  update_shopping_cart();
}

function ajouter(id) {
  if (cart.content[id]) {
    cart.content[id].quantity = cart.content[id].quantity + 1;
    cart.content[id].last_add = new Date();
  } else {
    cart.content[id] = { added_at: new Date(), product: all_products[id], quantity: 1 };
  }
  cart.total.items = cart.total.items + 1;
  update_shopping_cart();
}

function update_shopping_cart() {
  $(".basket-content").attr("data-count", cart.total.items);

  $(".cart_container").html("");
  let total = 0;
  Object.keys(cart.content).map((id) => {
    let cart_product = cart.content[id];
    total += cart_product.product.price;
    $(".cart_container").append(`
    <div class="row py-2">
    <div class="col-sm-6">
    <span class="quantity" style="color: goldenrod">${cart_product.quantity}</span>
    &times;
    <strong class="name">${cart_product.product.name}</strong>
    </div>
    <div class="col-sm-6 text-right">
    <strong class="pr-3">
    ${cart_product.product.price} ${shop.devise.symbol}
    </strong>
    <button class="btn btn-danger text-white btn-sm" onclick="remove(${id})">${cart_product.quantity == 1 ? "&times;" : "-"}</button>
    </div>
    </div>
    `);
  });
  cart.total.total_price = total;
  $("#cartModal .total").html(total + " " + shop.devise.symbol);
  cart.updated_at = new Date();
  localStorage.setItem("cart", JSON.stringify(cart));
}

function order() {
  $(".order_btn").html("Commande en cours ... Veuillez patienter");
  let ids_products = Object.keys(cart.content).map((product_id) => {
    return { id: cart.content[product_id].product.id, qte: cart.content[product_id].quantity, added_at: cart.content[product_id].added_at };
  });

  let panier = {
    entreprise_id: shop.id,
    subtotal: cart.total.total_price,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
    content: Object.keys(cart.content).map((product_id) => {
      return {
        produit: cart.content[product_id].product,
        qte: cart.content[product_id].quantity,
        added_at: cart.content[product_id].added_at,
        last_add: cart.content[product_id].last_add,
      };
    }),
  };
  let client = {
    nom: "Client QRCode",
    email: "client_restaurant@ambassade-rouen.fr",
    paiement: "Sur place",
    tel: "+00000000",
    adresse: `Restaurant`,
    date_livraison: new Date(),
    commentaire: "",
  };

  localStorage.setItem("client_", JSON.stringify(client));
  let command = {};
  command.client_details = client;
  command.restaurant_id = shop.id;
  command.produits_id = ids_products;
  command.subtotal = panier.subtotal;
  // command.note = cart.note;
  command.reduction = {};
  command.note = "Adresse de livraison : " + client.adresse + "\n\n" + client.commentaire;
  command.client_email = client.email;
  command.shipping = {
    address: client.adresse,
    address_type: 1,
    state: 0,
    human_date: new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    date: Date.now(),
    mode: "standard",
  };
  command.payment = {
    state: 0,
    date: new Date().toJSON().toString().replace("T", " ").replace("Z", "").split(".")[0],
    mode: client.paiement,
    intent: null,
  };
  command.source = "qrcode";
  command.livraison = 0;
  command.subtotal = panier.subtotal;
  command.total = panier.subtotal;

  console.log(command);

  $.ajax({
    type: "POST",
    beforeSend: function (request) {
      request.setRequestHeader("Authorization", "Bearer " + token);
    },
    url: "https://dashboard.genuka.com/api/2020-04/commands",
    contentType: "application/json",
    data: JSON.stringify({
      ...command,
    }),
    dataType: "json",
    success: (data) => {
      cart = {
        content: {},
        total: { items: 0, total_price: 0 },
        reduction: {},
        created_at: new Date(),
        updated_at: new Date(),
        livraison: {},
      };
      localStorage.setItem("cart", JSON.stringify(cart));
      $(".modal").modal("hide");
      $(".order_btn").html(`Passer la commande (<span class="total text-white"></span>)`);
      update_shopping_cart()
      alert("Merci pour votre commande, nous la préparons rapidement.");

      // $(".btn-valider").removeAttr("disabled");
    },
  });
}

function get_value_division(value) {
  return 4;
}

function loadShop(shop) {
  update_shopping_cart();
  // Chargement du token de la shop
  $.ajax({
    type: "GET",
    url: "https://dashboard.genuka.com/api/2021-05/shops/" + shop.id,
    contentType: "application/json",
    dataType: "json",
    success: (data) => {
      token = data.token;
    },
  });
  // fetch("https://dashboard.genuka.com/api/2021-05/shops/" + shop.id)
  //   .then((res) => res.json())
  //   .then((data) => {
  //     token = data.token;
  //   });

  // Chagement des informations
  console.log("Shop : ", shop);
  if (shop.logo != null) {
    $("#logo").attr("src", `${shop.logo}`);
    $("#logo").attr("alt", `Logo ${shop.name}`);
    $("link[rel=icon]").attr("href", `${shop.logo}`);
  } else {
    $("#logo").addClass("d-none");
  }
  // $(".phone-contact").html(shop.tel);
  $(".restaurant_name").html(shop.name);
  $(".restaurant_description").html(shop.description);
  $(".shop_description_footer").html(shop.description);
  $(".shop-footer").html(shop.name);
  $(".shop-footer").attr("href", shop.website);
  if (shop.datas.settings?.address) $(".address").html(shop.datas?.settings?.address);
  else $(".address").css("opacity", "0");
  $(".phone").html(shop.tel);
  $(".email").attr("href", "mailto:" + shop.email);
  $(".email-text").html(shop.email);
  // document.querySelector(".plates").innerHTML = "";
  if (shop.datas.settings && shop.datas.settings.social_networks) {
    shop.datas.settings.social_networks?.forEach((social) => {
      $(".ftco-footer-social").append(`
      <li class="ftco-animate"><a href="${social.link}"><span class="icon-${social.name}"></span></a></li>
      `);
    });
  }
  // chargement des collections
  $.ajax({
    type: "GET",
    url: "https://dashboard.genuka.com/api/2021-05/companies/" + shop.id + "/collections?per_page=200",
    contentType: "application/json",
    dataType: "json",
    success: (res) => {
      let collections = res.data;
      collections.reverse().forEach((collection, i) => {
        $("#v-pills-tab").append(` <a class="nav-link ${i === 0 ? "show active" : ""}" id="v-pills-${collection.id}-tab" data-toggle="pill" href="#v-pills-${collection.id}" role="tab" aria-controls="v-pills-${collection.id}" aria-selected="true">${collection.name}</a>`);
        $("#v-pills-tabContent").append(`
            
          <div class="tab-pane fade  ${i === 0 ? "show active" : ""}" id="v-pills-${collection.id}" role="tabpanel" aria-labelledby="v-pills-${collection.id}-tab">
            <p class="text-center">${collection.description ? collection.description : ""}</p>
            <br>
            <div class="container-wrap">
              <div class="row no-gutters plates justify-content-between">
                  
              </div>
            </div>
          </div>
          `);

        $.ajax({
          type: "GET",
          url: "https://dashboard.genuka.com/api/2021-05/companies/" + shop.id + "/collections/" + collection.id + "?per_page=200",
          contentType: "application/json",
          dataType: "json",
          success: (res) => {
            let products = res.products.data;
            products.forEach((plat, i) => {
              all_products[plat.id] = plat;
              $("#v-pills-" + collection.id + " .plates").append(`
                    <div class="col-lg-${get_value_division(products.length)} services-wrap d-flex">
                      <a href="#" class="img ${parseInt(i / 3) % 2 == 0 ? "" : "order-lg-last"}" style="background-image: url('${plat.medias.length > 0 ? plat.medias[0].link : "https://via.placeholder.com/?text=Pas%20d'image"}');"></a>
                      <div class="text p-4">
                        <h3>${plat.name}</h3>
                        <div style="min-height: 100px;min-width: 100%">${plat.description == null ? "" : plat.description}</div>
                        <p class="price"><span>${plat.price} ${shop.devise.symbol}</span> <a href="#!" class="ml-2 btn btn-white btn-outline-white"
                        onclick="ajouter(${plat.id})">Ajouter</a></p>
                    </div>
                  </div>    
                `);
            });
          },
        });
      });
    },
  });
}

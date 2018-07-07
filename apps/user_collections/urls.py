# user_collections/urls.py
from django.conf.urls import url
from user_collections.views import (
    api_edit_collection,
    view_collection,
    collection_status,
    reset_session,
    edit_collection_range,
)

# user_collections - all your carts are belong to us
urlpatterns = [
    url(r'^collections/(?P<collection_name>[default]+)/(?P<action>[add|remove|addrange|removerange|addall]+).json$', api_edit_collection),
    url(r'^collections/(?P<collection_name>[default]+)/view.html$', view_collection),
    url(r'^collections/(?P<collection_name>[default]+)/status.json$', collection_status),
    url(r'^collections/reset.html$', reset_session),
    url(r'^collections/(?P<collection_name>[default]+)/(?P<action>[addrange|removerange]+)/test.html$', edit_collection_range),
]
